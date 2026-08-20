import type { PaymentProviderType } from "../types/payment.types.js";
import type { PaymentProvider } from "./payment-provider.interface.js";

import { PaymentProviderError } from "./payment-provider.error.js";
import { RazorpayProvider } from "./razorpay.provider.js";
import { StripeProvider } from "./stripe.provider.js";

const razorpayProvider = new RazorpayProvider();
const stripeProvider = new StripeProvider();

export function getPaymentProvider(
  provider: PaymentProviderType,
): PaymentProvider {
  switch (provider) {
    case "RAZORPAY":
      return razorpayProvider;

    case "STRIPE":
      return stripeProvider;

    default:
      throw new PaymentProviderError(
        `Unsupported payment provider: ${provider}`,
        {
          provider,
          code: "UNSUPPORTED_PAYMENT_PROVIDER",
          retryable: false,
        },
      );
  }
}