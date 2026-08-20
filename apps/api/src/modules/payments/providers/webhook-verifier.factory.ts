import type {
  PaymentProviderType,
} from "../types/payment.types.js";

import type {
  WebhookSignatureVerifier,
} from "./webhook-verification.interface.js";

import {
  RazorpayWebhookVerifier,
} from "./razorpay-webhook-verifier.js";

import {
  StripeWebhookVerifier,
} from "./stripe-webhook-verifier.js";

function getProviderSecret(
  provider: PaymentProviderType,
): string {
  switch (provider) {
    case "RAZORPAY":
      return (
        process.env.RAZORPAY_WEBHOOK_SECRET ??
        ""
      );

    case "STRIPE":
      return (
        process.env.STRIPE_WEBHOOK_SECRET ??
        ""
      );

    default:
      return "";
  }
}

export function getWebhookVerifier(
  provider: PaymentProviderType,
): WebhookSignatureVerifier {
  const secret =
    getProviderSecret(provider);

  switch (provider) {
    case "RAZORPAY":
      return new RazorpayWebhookVerifier(
        secret,
      );

    case "STRIPE":
      return new StripeWebhookVerifier(
        secret,
      );

    default:
      throw new Error(
        `Unsupported webhook provider: ${provider}`,
      );
  }
}