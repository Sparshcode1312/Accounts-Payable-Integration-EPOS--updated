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

function getStripeSecretKey(): string {
  const key = env.STRIPE_SECRET_KEY;

  if (!key || key.trim().length === 0) {
    throw new PaymentProviderError(
      "Stripe secret key is not configured",
      {
        provider: "STRIPE",
        code: "STRIPE_NOT_CONFIGURED",
        retryable: false,
      },
    );
  }

  return key;
}

async function getStripeClient() {
  const secretKey = getStripeSecretKey();

  try {
    const { default: Stripe } = await import("stripe");
    return new Stripe(secretKey);
  } catch {
    throw new PaymentProviderError(
      "Stripe SDK is not installed. Run: pnpm add stripe",
      {
        provider: "STRIPE",
        code: "STRIPE_SDK_MISSING",
        retryable: false,
      },
    );
  }
}

function amountToSmallestUnit(
  amount: string,
): number {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new PaymentProviderError(
      "Payment amount must be greater than zero",
      {
        provider: "STRIPE",
        code: "INVALID_PAYMENT_AMOUNT",
        retryable: false,
      },
    );
  }

  const smallestUnit = Math.round(numericAmount * 100);

  if (smallestUnit <= 0) {
    throw new PaymentProviderError(
      "Payment amount is too small",
      {
        provider: "STRIPE",
        code: "INVALID_PAYMENT_AMOUNT",
        retryable: false,
      },
    );
  }

  return smallestUnit;
}

export class StripeProvider implements PaymentProvider {
  readonly name = "STRIPE";

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    try {
      const stripe = await getStripeClient();

      const amount = amountToSmallestUnit(input.amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: input.currency.toLowerCase(),
        capture_method: "manual",
        metadata: {
          paymentId: input.paymentId,
          ...(input.metadata
            ? Object.fromEntries(
                Object.entries(input.metadata)
                  .filter(([, value]) => typeof value === "string")
              ) as Record<string, string>
            : {}),
        },
        ...(input.description
          ? { description: input.description }
          : {}),
      });

      return {
        providerTransactionId: paymentIntent.id,
        status: "PENDING",
        amount: (amount / 100).toFixed(2),
        currency: paymentIntent.currency.toUpperCase(),
        metadata: input.metadata,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to create Stripe payment intent",
        {
          provider: this.name,
          code: "STRIPE_CREATE_PAYMENT_FAILED",
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
      const stripe = await getStripeClient();

      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.providerTransactionId,
      );

      if (!paymentIntent) {
        return {
          providerTransactionId: input.providerTransactionId,
          status: "FAILED",
          verified: false,
        };
      }

      const statusMap: Record<string, import("../types/payment.types.js").PaymentStatus> = {
        requires_payment_method: "INITIATED",
        requires_confirmation: "INITIATED",
        requires_action: "PENDING",
        processing: "PENDING",
        requires_capture: "AUTHORIZED",
        canceled: "CANCELLED",
        succeeded: "CAPTURED",
      };

      const mappedStatus = statusMap[paymentIntent.status] ?? "PENDING";

      return {
        providerTransactionId: paymentIntent.id,
        status: mappedStatus,
        verified: true,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to verify Stripe payment",
        {
          provider: this.name,
          code: "STRIPE_VERIFY_FAILED",
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
      const stripe = await getStripeClient();

      const captureParams: Record<string, unknown> = {};

      if (input.amount) {
        captureParams.amount_to_capture = amountToSmallestUnit(input.amount);
      }

      const captured = await stripe.paymentIntents.capture(
        input.providerTransactionId,
        captureParams as { amount_to_capture?: number },
      );

      const capturedAmount = captured.amount_received ?? captured.amount;

      return {
        providerTransactionId: captured.id,
        status: "CAPTURED",
        capturedAmount: (capturedAmount / 100).toFixed(2),
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to capture Stripe payment",
        {
          provider: this.name,
          code: "STRIPE_CAPTURE_FAILED",
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
      const stripe = await getStripeClient();

      const amountInSmallestUnit = amountToSmallestUnit(input.amount);

      const refund = await stripe.refunds.create({
        payment_intent: input.providerTransactionId,
        amount: amountInSmallestUnit,
        ...(input.reason
          ? { reason: "requested_by_customer" as const }
          : {}),
        metadata: {
          ...(input.reason
            ? { refund_reason: input.reason }
            : {}),
        },
      });

      const statusMap: Record<string, "PENDING" | "COMPLETED" | "FAILED"> = {
        pending: "PENDING",
        succeeded: "COMPLETED",
        failed: "FAILED",
        canceled: "FAILED",
      };

      return {
        providerRefundId: refund.id,
        status: statusMap[refund.status ?? ""] ?? "PENDING",
        amount: (amountInSmallestUnit / 100).toFixed(2),
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }

      throw new PaymentProviderError(
        "Failed to refund Stripe payment",
        {
          provider: this.name,
          code: "STRIPE_REFUND_FAILED",
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
      "Stripe settlement retrieval is not implemented yet",
      {
        provider: this.name,
        code: "STRIPE_SETTLEMENT_NOT_IMPLEMENTED",
        retryable: false,
      },
    );
  }
}