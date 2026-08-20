import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  WebhookSignatureVerifier,
  VerifyWebhookSignatureInput,
} from "./webhook-verification.interface.js";

export class StripeWebhookVerifier
  implements WebhookSignatureVerifier
{
  readonly provider = "STRIPE";

  constructor(
    private readonly secret: string,
  ) {}

  verifySignature(
    input: VerifyWebhookSignatureInput,
  ): boolean {
    if (!this.secret) {
      return false;
    }

    const signature =
      input.signature;

    const expectedSignature =
      createHmac(
        "sha256",
        this.secret,
      )
        .update(input.payload)
        .digest("hex");

    const receivedBuffer =
      Buffer.from(signature, "utf8");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8",
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      receivedBuffer,
      expectedBuffer,
    );
  }
}