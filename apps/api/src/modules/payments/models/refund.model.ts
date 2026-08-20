import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

import {
  REFUND_STATUSES,
  REFUND_TYPES,
} from "../types/payment.types.js";

const refundSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    branchId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    refundNumber: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: REFUND_TYPES,
      required: true,
    },

    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    reason: {
      type: String,
      required: false,
      trim: true,
    },

    status: {
      type: String,
      enum: REFUND_STATUSES,
      required: true,
      default: "INITIATED",
      index: true,
    },

    providerRefundId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    initiatedAt: {
      type: Date,
      required: false,
    },

    completedAt: {
      type: Date,
      required: false,
    },

    failedAt: {
      type: Date,
      required: false,
    },

    cancelledAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

refundSchema.index({
  tenantId: 1,
  paymentId: 1,
  createdAt: -1,
});

refundSchema.index({
  tenantId: 1,
  orderId: 1,
  createdAt: -1,
});

refundSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

refundSchema.index({
  tenantId: 1,
  providerRefundId: 1,
});

refundSchema.index(
  {
    tenantId: 1,
    refundNumber: 1,
  },
  {
    unique: true,
  },
);

export type RefundDocument =
  HydratedDocument<
    InferSchemaType<typeof refundSchema>
  >;

export const RefundModel =
  model<RefundDocument>(
    "Refund",
    refundSchema,
  );