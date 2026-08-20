import { z } from "zod";

import {
  PAYMENT_METHODS,
  PAYMENT_PROVIDER_TYPES,
} from "../types/payment.types.js";

export const createPaymentSchema =
  z.object({
    tenantId: z
      .string()
      .min(1, "tenantId is required"),

    branchId: z
      .string()
      .min(1, "branchId is required"),

    orderId: z
      .string()
      .min(1, "orderId is required"),

    customerId: z
      .string()
      .min(1)
      .optional(),

    paymentNumber: z
      .string()
      .trim()
      .min(
        1,
        "paymentNumber is required",
      ),

    method: z.enum(
      PAYMENT_METHODS,
    ),

    provider: z
      .enum(PAYMENT_PROVIDER_TYPES)
      .optional(),

    providerId: z
      .string()
      .min(1)
      .optional(),

    amount: z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        "amount must be a valid positive monetary value",
      )
      .refine(
        (value) => Number(value) > 0,
        {
          message:
            "amount must be greater than zero",
        },
      ),

    currency: z
      .string()
      .trim()
      .length(
        3,
        "currency must be a 3-letter ISO currency code",
      )
      .transform((value) =>
        value.toUpperCase(),
      ),

    idempotencyKey: z
      .string()
      .trim()
      .min(
        1,
        "idempotencyKey is required",
      )
      .max(255),

    parentPaymentId: z
      .string()
      .min(1)
      .optional(),

    metadata: z
      .record(z.string(), z.unknown())
      .optional(),
  });

export type CreatePaymentRequest =
  z.infer<typeof createPaymentSchema>;