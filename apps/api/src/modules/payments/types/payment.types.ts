export const PAYMENT_METHODS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "UPI",
  "BANK_TRANSFER",
  "DIGITAL_WALLET",
  "PAYMENT_GATEWAY",
  "GIFT_CARD",
  "LOYALTY_POINTS",
] as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "INITIATED",
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "SETTLED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDER_TYPES = [
  "RAZORPAY",
  "STRIPE",
  "OTHER",
] as const;

export type PaymentProviderType =
  (typeof PAYMENT_PROVIDER_TYPES)[number];

export const REFUND_STATUSES = [
  "INITIATED",
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type RefundStatus =
  (typeof REFUND_STATUSES)[number];

  export const REFUND_TYPES = [
  "FULL",
  "PARTIAL",
] as const;

export type RefundType =
  (typeof REFUND_TYPES)[number];

export const WEBHOOK_EVENT_TYPES = [
  "PAYMENT_CREATED",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
  "PAYMENT_CANCELLED",
  "REFUND_INITIATED",
  "REFUND_COMPLETED",
   "REFUND_FAILED",
  "SETTLEMENT_COMPLETED",
] as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENT_TYPES)[number];

  export const WEBHOOK_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
] as const;

export type WebhookStatus =
  (typeof WEBHOOK_STATUSES)[number];

  export const WEBHOOK_PROVIDERS = [
  "RAZORPAY",
  "STRIPE",
] as const;

export type WebhookProvider =
  (typeof WEBHOOK_PROVIDERS)[number];