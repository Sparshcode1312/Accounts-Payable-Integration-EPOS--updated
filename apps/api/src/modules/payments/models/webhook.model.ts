import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

import {
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROVIDERS,
  WEBHOOK_STATUSES,
} from "../types/payment.types.js";

const webhookSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: WEBHOOK_PROVIDERS,
      required: true,
      index: true,
    },

    eventId: {
      type: String,
      required: true,
      trim: true,
    },

    eventType: {
      type: String,
      enum: WEBHOOK_EVENT_TYPES,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: WEBHOOK_STATUSES,
      required: true,
      default: "RECEIVED",
      index: true,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    refundId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    providerTransactionId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },

    signature: {
      type: String,
      required: false,
      trim: true,
    },

    processedAt: {
      type: Date,
      required: false,
    },

    failedAt: {
      type: Date,
      required: false,
    },

    errorMessage: {
      type: String,
      required: false,
      trim: true,
    },

    retryCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

webhookSchema.index(
  {
    provider: 1,
    eventId: 1,
  },
  {
    unique: true,
  },
);

webhookSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

webhookSchema.index({
  tenantId: 1,
  eventType: 1,
  createdAt: -1,
});

webhookSchema.index({
  tenantId: 1,
  paymentId: 1,
  createdAt: -1,
});

webhookSchema.index({
  tenantId: 1,
  refundId: 1,
  createdAt: -1,
});

export type WebhookDocument =
  HydratedDocument<
    InferSchemaType<typeof webhookSchema>
  >;

export const WebhookModel =
  model<WebhookDocument>(
    "Webhook",
    webhookSchema,
  );