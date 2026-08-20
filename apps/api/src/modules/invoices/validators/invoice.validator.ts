import { z } from "zod";

import {
  INVOICE_TYPES,
  DISCOUNT_TYPES,
} from "../types/invoice.types.js";

const invoiceItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),

  description: z.string().trim().min(1).optional(),

  quantity: z.number().int().min(1, "Quantity must be at least 1"),

  unitPrice: z
    .string()
    .regex(
      /^\d+(\.\d{1,2})?$/,
      "unitPrice must be a valid monetary value",
    )
    .refine((v) => Number(v) >= 0, {
      message: "unitPrice must be non-negative",
    }),

  discountType: z.enum(DISCOUNT_TYPES).optional(),

  discountValue: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "discountValue must be a valid monetary value")
    .optional(),

  taxRate: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "taxRate must be a valid percentage")
    .optional(),

  taxAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "taxAmount must be a valid monetary value")
    .optional(),

  totalAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "totalAmount must be a valid monetary value")
    .optional(),
});

export const createInvoiceSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),

  branchId: z.string().min(1, "branchId is required"),

  customerId: z.string().min(1).optional(),

  orderId: z.string().min(1).optional(),

  paymentId: z.string().min(1).optional(),

  invoiceType: z.enum(INVOICE_TYPES).optional(),

  issueDate: z.string().min(1).optional(),

  dueDate: z.string().min(1).optional(),

  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one item is required"),

  serviceCharge: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "serviceCharge must be a valid monetary value")
    .optional(),

  currency: z
    .string()
    .trim()
    .length(3, "currency must be a 3-letter ISO currency code")
    .transform((v) => v.toUpperCase()),

  notes: z.string().trim().min(1).optional(),

  referenceInvoiceId: z.string().min(1).optional(),

  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateInvoiceRequest =
  z.infer<typeof createInvoiceSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});

export type CancelInvoiceRequest =
  z.infer<typeof cancelInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z
    .string()
    .regex(
      /^\d+(\.\d{1,2})?$/,
      "amount must be a valid positive monetary value",
    )
    .refine((v) => Number(v) > 0, {
      message: "amount must be greater than zero",
    }),

  paymentId: z.string().min(1).optional(),
});

export type RecordPaymentRequest =
  z.infer<typeof recordPaymentSchema>;
