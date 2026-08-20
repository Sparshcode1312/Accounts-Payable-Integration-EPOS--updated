export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
] as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUSES)[number];

export const INVOICE_TYPES = [
  "STANDARD",
  "TAX_INVOICE",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "REFUND_INVOICE",
] as const;

export type InvoiceType =
  (typeof INVOICE_TYPES)[number];

export const DISCOUNT_TYPES = [
  "PERCENTAGE",
  "FIXED",
] as const;

export type DiscountType =
  (typeof DISCOUNT_TYPES)[number];
