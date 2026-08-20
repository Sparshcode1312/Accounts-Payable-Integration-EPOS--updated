export interface VerifyWebhookSignatureInput {
  payload: string;
  signature: string;
}

export interface WebhookSignatureVerifier {
  readonly provider: string;

  verifySignature(
    input: VerifyWebhookSignatureInput,
  ): boolean;
}