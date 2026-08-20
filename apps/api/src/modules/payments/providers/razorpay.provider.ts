import Razorpay from "razorpay";

import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  CapturePaymentInput,
  CapturePaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
  Settlement,
} from "./payment-provider.interface.js";

import { PaymentProviderError } from "./payment-provider.error.js";

import { env } from "../../../config/env.js";

function getRazorpayClient(): Razorpay {
  const keyId =
    env.RAZORPAY_KEY_ID;

  const keySecret =
    env.RAZORPAY_KEY_SECRET;

  if (
    !keyId ||
    keyId.trim().length === 0
  ) {
    throw new PaymentProviderError(
      "Razorpay key ID is not configured",
      {
        provider: "RAZORPAY",
        code: "RAZORPAY_NOT_CONFIGURED",
        retryable: false,
      },
    );
  }

  if (
    !keySecret ||
    keySecret.trim().length === 0
  ) {
    throw new PaymentProviderError(
      "Razorpay key secret is not configured",
      {
        provider: "RAZORPAY",
        code: "RAZORPAY_NOT_CONFIGURED",
        retryable: false,
      },
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function amountToPaise(
  amount: string,
): number {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount,
    ) ||
    numericAmount <= 0
  ) {
    throw new PaymentProviderError(
      "Payment amount must be greater than zero",
      {
        provider: "RAZORPAY",
        code: "INVALID_PAYMENT_AMOUNT",
        retryable: false,
      },
    );
  }

  const paise =
    Math.round(
      numericAmount * 100,
    );

  if (paise <= 0) {
    throw new PaymentProviderError(
      "Payment amount is too small",
      {
        provider: "RAZORPAY",
        code: "INVALID_PAYMENT_AMOUNT",
        retryable: false,
      },
    );
  }

  return paise;
}

export class RazorpayProvider
  implements PaymentProvider
{
  readonly name = "RAZORPAY";

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    try {
      const razorpay =
        getRazorpayClient();

      const amount =
        amountToPaise(
          input.amount,
        );

      const order =
        await razorpay.orders.create({
          amount,
          currency:
            input.currency,
          receipt:
            input.paymentId,
          ...(input.metadata
            ? {
                notes:
                  Object.fromEntries(
                    Object.entries(
                      input.metadata,
                    ).filter(
                      ([, value]) =>
                        typeof value ===
                        "string",
                    ),
                  ) as Record<
                    string,
                    string
                  >,
              }
            : {}),
        });

      return {
        providerTransactionId:
          order.id,

        status: "PENDING",

        amount: (
          Number(order.amount) /
          100
        ).toFixed(2),

        currency:
          order.currency,

        ...(input.metadata
          ? {
              metadata:
                input.metadata,
            }
          : {}),
      };
    } catch (error) {
      if (
        error instanceof
        PaymentProviderError
      ) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to create Razorpay order",
        {
          provider: this.name,
          code:
            "RAZORPAY_CREATE_PAYMENT_FAILED",
          retryable: true,
          cause: error,
        },
      );
    }
  }

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    try {
      const razorpay = getRazorpayClient();

      const payment = await razorpay.payments.fetch(
        input.providerTransactionId,
      );

      if (!payment) {
        return {
          providerTransactionId: input.providerTransactionId,
          status: "FAILED",
          verified: false,
        };
      }

      const statusMap: Record<string, import("../types/payment.types.js").PaymentStatus> = {
        created: "INITIATED",
        authorized: "AUTHORIZED",
        captured: "CAPTURED",
        refunded: "REFUNDED",
        failed: "FAILED",
      };

      const mappedStatus = statusMap[payment.status as string] ?? "PENDING";

      return {
        providerTransactionId: payment.id,
        status: mappedStatus,
        verified: true,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to verify Razorpay payment",
        {
          provider: this.name,
          code: "RAZORPAY_VERIFY_FAILED",
          retryable: true,
          cause: error,
        },
      );
    }
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentResult> {
    try {
      const razorpay = getRazorpayClient();

      const captureAmount = input.amount
        ? amountToPaise(input.amount)
        : undefined;

      const payment = await razorpay.payments.fetch(
        input.providerTransactionId,
      );

      if (!payment) {
        throw new PaymentProviderError(
          "Payment not found on Razorpay",
          {
            provider: this.name,
            code: "RAZORPAY_PAYMENT_NOT_FOUND",
            retryable: false,
          },
        );
      }

      const amountToCapture = captureAmount ?? Number(payment.amount);

      const captured = await razorpay.payments.capture(
        input.providerTransactionId,
        amountToCapture,
        payment.currency as string,
      );

      return {
        providerTransactionId: captured.id,
        status: "CAPTURED",
        capturedAmount: (amountToCapture / 100).toFixed(2),
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to capture Razorpay payment",
        {
          provider: this.name,
          code: "RAZORPAY_CAPTURE_FAILED",
          retryable: true,
          cause: error,
        },
      );
    }
  }

  async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    try {
      const razorpay = getRazorpayClient();

      const amountInPaise = amountToPaise(input.amount);

      const refund = await razorpay.payments.refund(
        input.providerTransactionId,
        {
          amount: amountInPaise,
          ...(input.reason
            ? { notes: { reason: input.reason } }
            : {}),
        },
      );

      const statusMap: Record<string, "PENDING" | "COMPLETED" | "FAILED"> = {
        pending: "PENDING",
        processed: "COMPLETED",
        failed: "FAILED",
      };

      return {
        providerRefundId: refund.id,
        status: statusMap[refund.status as string] ?? "PENDING",
        amount: (amountInPaise / 100).toFixed(2),
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to refund Razorpay payment",
        {
          provider: this.name,
          code: "RAZORPAY_REFUND_FAILED",
          retryable: true,
          cause: error,
        },
      );
    }
  }

  async getSettlements(
    _from: Date,
    _to: Date,
  ): Promise<Settlement[]> {
    throw new PaymentProviderError(
      "Razorpay settlement integration is not implemented yet",
      {
        provider: this.name,
        code:
          "RAZORPAY_SETTLEMENT_NOT_IMPLEMENTED",
        retryable: false,
      },
    );
  }
}