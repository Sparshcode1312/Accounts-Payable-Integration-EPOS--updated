import { paymentRepository } from "../repositories/payment.repository.js";

import {
  assertValidTransition,
} from "./payment-state-machine.js";

import {
  getPaymentProvider,
} from "../providers/payment-provider.factory.js";

import type {
  PaymentMethod,
  PaymentProviderType,
  PaymentStatus,
} from "../types/payment.types.js";

export interface CreatePaymentInput {
  tenantId: string;
  branchId: string;
  orderId: string;
  customerId?: string;
  paymentNumber: string;
  method: PaymentMethod;
  provider?: PaymentProviderType;
  providerId?: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  parentPaymentId?: string;
  metadata?: Record<string, unknown>;
}

export class PaymentService {
  async createPayment(
    input: CreatePaymentInput,
  ) {
    /*
     * 1. Idempotency check.
     *
     * If this request was already processed,
     * return the existing payment.
     */
    const existing =
      await paymentRepository.findByIdempotencyKey(
        input.tenantId,
        input.idempotencyKey,
      );

    if (existing) {
      return existing;
    }

    /*
     * 2. Create the internal payment record.
     */
    const payment =
      await paymentRepository.create({
        tenantId:
          input.tenantId,

        branchId:
          input.branchId,

        orderId:
          input.orderId,

        ...(input.customerId
          ? {
              customerId:
                input.customerId,
            }
          : {}),

        paymentNumber:
          input.paymentNumber,

        method:
          input.method,

        ...(input.provider
          ? {
              provider:
                input.provider,
            }
          : {}),

        ...(input.providerId
          ? {
              providerId:
                input.providerId,
            }
          : {}),

        amount:
          input.amount,

        currency:
          input.currency,

        idempotencyKey:
          input.idempotencyKey,

        ...(input.parentPaymentId
          ? {
              parentPaymentId:
                input.parentPaymentId,
            }
          : {}),

        ...(input.metadata
          ? {
              metadata:
                input.metadata,
            }
          : {}),
      });

    /*
     * 3. If no external provider is selected,
     *    return the internal payment.
     *
     * This keeps support for non-provider
     * payment methods such as CASH.
     */
    if (!input.provider) {
      return payment;
    }

    /*
     * 4. Resolve the configured provider.
     */
    const provider =
      getPaymentProvider(
        input.provider,
      );

    /*
     * 5. Create the payment/order
     *    with the external provider.
     */
    let providerResult;

try {
  providerResult =
    await provider.createPayment({
      paymentId:
        payment._id.toString(),

      amount:
        input.amount,

      currency:
        input.currency,

      method:
        input.method,

      ...(input.metadata
        ? {
            metadata:
              input.metadata,
          }
        : {}),
    });
} catch (error) {
  await paymentRepository.updateStatus(
    payment._id.toString(),
    input.tenantId,
    "FAILED",
    {
      failedAt: new Date(),
    },
  );

  throw error;
}

    /*
     * 6. Store the provider transaction ID
     *    on our internal payment record.
     */
    const updatedPayment =
      await paymentRepository.setProviderTransaction(
        payment._id.toString(),
        input.tenantId,
        providerResult.providerTransactionId,
      );

    /*
     * 7. The payment should always exist because
     *    it was created immediately above.
     */
    if (!updatedPayment) {
      throw new Error(
        "Payment was created but could not be updated with provider transaction ID",
      );
    }

    /*
     * 8. Move the internal payment to the
     *    provider-reported initial status.
     */
    if (
  providerResult.status !==
  updatedPayment.status
) {
  assertValidTransition(
    updatedPayment.status,
    providerResult.status,
  );

  const timestampField =
    this.getTimestampField(
      providerResult.status,
    );

  return (
    (await paymentRepository.updateStatus(
      updatedPayment._id.toString(),
      input.tenantId,
      providerResult.status,
      timestampField
        ? {
            [timestampField]:
              new Date(),
          }
        : {},
    )) ??
    updatedPayment
  );
}
    return updatedPayment;
  }

  async getPayment(
    tenantId: string,
    paymentId: string,
  ) {
    return paymentRepository.findById(
      paymentId,
      tenantId,
    );
  }

  async getPaymentStatus(
    tenantId: string,
    paymentId: string,
  ) {
    const payment =
      await paymentRepository.findById(
        paymentId,
        tenantId,
      );

    if (!payment) {
      return null;
    }

    return {
      id: payment._id.toString(),

      paymentNumber:
        payment.paymentNumber,

      status:
        payment.status,
    };
  }

  async capturePayment(
    tenantId: string,
    paymentId: string,
    amount?: string,
  ) {
    const payment =
      await paymentRepository.findById(
        paymentId,
        tenantId,
      );

    if (!payment) {
      throw new Error(
        "Payment not found",
      );
    }

    if (
      !payment.providerTransactionId
    ) {
      throw new Error(
        "Payment does not have a provider transaction ID",
      );
    }

    if (
      payment.status !==
        "AUTHORIZED" &&
      payment.status !== "PENDING"
    ) {
      throw new Error(
        `Payment cannot be captured from status ${payment.status}`,
      );
    }

    if (
      amount !== undefined &&
      Number(amount) <= 0
    ) {
      throw new Error(
        "Capture amount must be greater than zero",
      );
    }

    /*
     * Provider must come from the payment
     * document itself, not metadata.
     */
    const providerType =
      payment.provider;

    if (
      providerType !==
        "RAZORPAY" &&
      providerType !== "STRIPE"
    ) {
      throw new Error(
        "Payment provider is not configured",
      );
    }

    const provider =
      getPaymentProvider(
        providerType,
      );

    const result =
      await provider.capturePayment({
        providerTransactionId:
          payment.providerTransactionId,

        ...(amount !== undefined
          ? {
              amount,
            }
          : {}),
      });

    if (
      result.status !==
      "CAPTURED"
    ) {
      throw new Error(
        `Payment capture was not completed. Provider status: ${result.status}`,
      );
    }

    return paymentRepository.updateStatus(
      paymentId,
      tenantId,
      "CAPTURED",
      {
        capturedAt:
          new Date(),
      },
    );
  }

  async transitionPayment(
    tenantId: string,
    paymentId: string,
    nextStatus: PaymentStatus,
  ) {
    const payment =
      await paymentRepository.findById(
        paymentId,
        tenantId,
      );

    if (!payment) {
      throw new Error(
        "Payment not found",
      );
    }

    assertValidTransition(
      payment.status,
      nextStatus,
    );

    const timestampField =
      this.getTimestampField(
        nextStatus,
      );

    return paymentRepository.updateStatus(
      paymentId,
      tenantId,
      nextStatus,
      timestampField
        ? {
            [timestampField]:
              new Date(),
          }
        : {},
    );
  }

  async listPayments(
    tenantId: string,
    filters: {
      branchId?: string;
      status?: string;
      method?: string;
      provider?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    return paymentRepository.findAll(
      tenantId,
      filters,
      pagination,
    );
  }

  private getTimestampField(
    status: PaymentStatus,
  ): string | null {
    switch (status) {
      case "CAPTURED":
        return "capturedAt";

      case "SETTLED":
        return "settledAt";

      case "FAILED":
        return "failedAt";

      case "CANCELLED":
        return "cancelledAt";

      default:
        return null;
    }
  }
}

export const paymentService =
  new PaymentService();