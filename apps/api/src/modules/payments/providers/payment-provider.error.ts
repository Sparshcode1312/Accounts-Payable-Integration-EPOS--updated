export class PaymentProviderError extends Error {
  public readonly provider: string;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      provider: string;
      code: string;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, {
      cause: options.cause,
    });

    this.name = "PaymentProviderError";
    this.provider = options.provider;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}