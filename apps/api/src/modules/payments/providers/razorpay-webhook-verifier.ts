import {
  createHmac,
} from "node:crypto";

import type {
  WebhookSignatureVerifier,
  VerifyWebhookSignatureInput,
} from "./webhook-verification.interface.js";

export class RazorpayWebhookVerifier
  implements WebhookSignatureVerifier
{
  readonly provider = "RAZORPAY";

  constructor(
    private readonly secret: string,
  ) {}

  verifySignature(
    input: VerifyWebhookSignatureInput,
  ): boolean {
    if (!this.secret) {
      return false;
    }

    const expectedSignature =
      createHmac(
        "sha256",
        this.secret,
      )
        .update(input.payload)
        .digest("hex");

    return expectedSignature ===
      input.signature;
  }
}