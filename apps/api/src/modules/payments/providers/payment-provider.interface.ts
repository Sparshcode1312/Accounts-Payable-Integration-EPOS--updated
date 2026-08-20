import type {
  PaymentMethod,
  PaymentStatus,
} from "../types/payment.types.js";

export interface CreatePaymentInput {
  paymentId: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResult {
  providerTransactionId: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  providerTransactionId: string;
  paymentId: string;
}

export interface VerifyPaymentResult {
  providerTransactionId: string;
  status: PaymentStatus;
  verified: boolean;
}

export interface CapturePaymentInput {
  providerTransactionId: string;
  amount?: string;
}

export interface CapturePaymentResult {
  providerTransactionId: string;
  status: PaymentStatus;
  capturedAmount: string;
}

export interface RefundPaymentInput {
  providerTransactionId: string;
  amount: string;
  reason?: string;
}

export interface RefundPaymentResult {
  providerRefundId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  amount: string;
}

export interface Settlement {
  settlementId: string;
  amount: string;
  currency: string;
  settledAt: Date;
  status: "PENDING" | "COMPLETED";
}

export interface PaymentProvider {
  readonly name: string;

  createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult>;

  verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult>;

  capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentResult>;

  refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentResult>;

  getSettlements(
    from: Date,
    to: Date,
  ): Promise<Settlement[]>;
}