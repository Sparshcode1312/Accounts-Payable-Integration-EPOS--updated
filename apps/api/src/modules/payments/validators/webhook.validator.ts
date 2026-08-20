import { z } from "zod";

import {
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROVIDERS,
} from "../types/payment.types.js";

export const receiveWebhookSchema =
  z.object({
    tenantId: z
      .string()
      .min(1, "tenantId is required"),

    provider: z.enum(
      WEBHOOK_PROVIDERS,
    ),

    eventId: z
      .string()
      .min(1, "eventId is required")
      .trim(),

    eventType: z.enum(
      WEBHOOK_EVENT_TYPES,
    ),

    payload: z.record(
      z.string(),
      z.unknown(),
    ),

    signature: z
      .string()
      .trim()
      .optional(),

    paymentId: z
      .string()
      .min(1)
      .optional(),

    refundId: z
      .string()
      .min(1)
      .optional(),

    providerTransactionId: z
      .string()
      .trim()
      .optional(),
  });