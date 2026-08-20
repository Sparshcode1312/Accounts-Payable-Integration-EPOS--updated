import { z } from "zod";

import {
  REFUND_TYPES,
} from "../types/payment.types.js";

export const createRefundSchema =
  z.object({
    tenantId: z
      .string()
      .min(1, "tenantId is required"),

    branchId: z
      .string()
      .min(1, "branchId is required"),

    type: z.enum(REFUND_TYPES),

    amount: z
      .string()
      .min(1, "amount is required")
      .refine(
        (value) => {
          const number = Number(value);

          return (
            Number.isFinite(number) &&
            number > 0
          );
        },
        {
          message:
            "amount must be a positive number",
        },
      ),

    reason: z
      .string()
      .trim()
      .min(1)
      .optional(),

    metadata: z
      .record(z.string(), z.unknown())
      .optional(),
  });