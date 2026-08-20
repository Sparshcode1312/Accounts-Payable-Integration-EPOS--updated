import {
  paymentRepository,
} from "../repositories/payment.repository.js";

import {
  refundRepository,
} from "../repositories/refund.repository.js";

import {
  getPaymentProvider,
} from "../providers/payment-provider.factory.js";

import {
  PaymentProviderError,
} from "../providers/payment-provider.error.js";

import type {
  RefundType,
} from "../types/payment.types.js";

export interface CreateRefundInput {
  tenantId: string;
  branchId: string;
  paymentId: string;
  type: RefundType;
  amount: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

function parseAmount(
  value: string,
): number {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Refund amount must be greater than zero",
    );
  }

  return amount;
}

function generateRefundNumber(): string {
  return `REF-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export class RefundService {
  async createRefund(
    input: CreateRefundInput,
  ) {
    /*
     * 1. Find original payment.
     */
    const payment =
      await paymentRepository.findById(
        input.paymentId,
        input.tenantId,
      );

    if (!payment) {
      throw new Error(
        "Payment not found",
      );
    }

    /*
     * 2. Refunds are allowed only for
     *    captured/settled/partially refunded payments.
     */
    if (
      payment.status !== "CAPTURED" &&
      payment.status !== "SETTLED" &&
      payment.status !==
        "PARTIALLY_REFUNDED"
    ) {
      throw new Error(
        `Payment cannot be refunded in status: ${payment.status}`,
      );
    }

    /*
     * 3. Validate refund amount.
     */
    const refundAmount =
      parseAmount(input.amount);

    const paymentAmount =
      Number(
        payment.amount.toString(),
      );

    /*
     * 4. Calculate already refunded amount.
     */
    const totalRefunded =
      Number(
        await refundRepository.getTotalRefundedAmount(
          input.tenantId,
          input.paymentId,
        ),
      );

    const remainingAmount =
      paymentAmount -
      totalRefunded;

    /*
     * 5. Prevent over-refunding.
     */
    if (
      refundAmount >
      remainingAmount
    ) {
      throw new Error(
        `Refund amount exceeds refundable amount. Remaining amount: ${remainingAmount.toFixed(2)}`,
      );
    }

    /*
     * 6. Create internal refund record.
     */
    const refund =
      await refundRepository.create({
        tenantId:
          input.tenantId,

        branchId:
          input.branchId,

        paymentId:
          input.paymentId,

        orderId:
          payment.orderId.toString(),

        refundNumber:
          generateRefundNumber(),

        type:
          input.type,

        amount:
          refundAmount.toFixed(2),

        currency:
          payment.currency,

        ...(input.reason !== undefined
          ? {
              reason:
                input.reason,
            }
          : {}),

        ...(input.metadata !== undefined
          ? {
              metadata:
                input.metadata,
            }
          : {}),
      });

    return refund;
  }

  async processRefund(
    tenantId: string,
    refundId: string,
  ) {
    /*
     * 1. Find refund.
     */
    const refund =
      await refundRepository.findById(
        refundId,
        tenantId,
      );

    if (!refund) {
      throw new Error(
        "Refund not found",
      );
    }

    /*
     * 2. Find original payment.
     */
    const payment =
      await paymentRepository.findById(
        refund.paymentId.toString(),
        tenantId,
      );

    if (!payment) {
      throw new Error(
        "Payment not found",
      );
    }

    /*
     * 3. Provider is required for
     *    provider-backed refunds.
     */
    if (!payment.provider) {
      throw new Error(
        "Payment provider is not configured for this payment",
      );
    }

    /*
     * 4. Provider transaction ID is
     *    required to issue the refund.
     */
    if (
      !payment.providerTransactionId
    ) {
      throw new Error(
        "Payment provider transaction ID is missing",
      );
    }

    /*
     * 5. Prevent processing an already
     *    completed refund.
     */
    if (
      refund.status === "COMPLETED"
    ) {
      return refund;
    }

    /*
     * 6. Mark refund as pending.
     */
    await refundRepository.updateStatus(
      refundId,
      tenantId,
      "PENDING",
      {
        initiatedAt:
          refund.initiatedAt ??
          new Date(),
      },
    );

    try {
      /*
       * 7. Resolve provider.
       */
      const provider =
        getPaymentProvider(
          payment.provider,
        );

      /*
       * 8. Execute provider refund.
       */
      const result =
        await provider.refundPayment({
          providerTransactionId:
            payment.providerTransactionId,

          amount:
            refund.amount.toString(),

          ...(refund.reason
            ? {
                reason:
                  refund.reason,
              }
            : {}),
        });

      /*
       * 9. Save provider refund ID.
       */
      if (
        result.providerRefundId
      ) {
        await refundRepository.setProviderRefundId(
          refundId,
          tenantId,
          result.providerRefundId,
        );
      }

      /*
       * 10. Update refund status.
       */
      const finalStatus =
        result.status === "COMPLETED"
          ? "COMPLETED"
          : result.status === "FAILED"
            ? "FAILED"
            : "PENDING";

      const extraFields: Record<
        string,
        unknown
      > = {};

      if (
        finalStatus ===
        "COMPLETED"
      ) {
        extraFields.completedAt =
          new Date();
      }

      if (
        finalStatus === "FAILED"
      ) {
        extraFields.failedAt =
          new Date();
      }

      return refundRepository.updateStatus(
        refundId,
        tenantId,
        finalStatus,
        extraFields,
      );
    } catch (error) {
      /*
       * Provider errors are converted
       * into a failed refund record only
       * when the provider explicitly reports
       * a non-retryable failure.
       */
      if (
        error instanceof
          PaymentProviderError &&
        !error.retryable
      ) {
        await refundRepository.updateStatus(
          refundId,
          tenantId,
          "FAILED",
          {
            failedAt: new Date(),
          },
        );
      }

      throw error;
    }
  }

  async getRefund(
    tenantId: string,
    refundId: string,
  ) {
    return refundRepository.findById(
      refundId,
      tenantId,
    );
  }

  async getPaymentRefunds(
    tenantId: string,
    paymentId: string,
  ) {
    return refundRepository.findByPaymentId(
      tenantId,
      paymentId,
    );
  }
}

export const refundService =
  new RefundService();