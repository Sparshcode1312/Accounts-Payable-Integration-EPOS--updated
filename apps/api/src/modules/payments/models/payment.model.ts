import {
  Schema,
  model,
   type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_PROVIDER_TYPES,
} from "../types/payment.types.js";

const paymentSchema = new Schema(
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

    orderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    paymentNumber: {
      type: String,
      required: true,
      trim: true,
    },

    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },

    providerId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    provider: {
  type: String,
  enum: PAYMENT_PROVIDER_TYPES,
  required: false,
  index: true,
},

    providerTransactionId: {
      type: String,
      required: false,
      trim: true,
      index: true,
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

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: "INITIATED",
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },

    parentPaymentId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    capturedAt: {
      type: Date,
      required: false,
    },

    settledAt: {
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

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentSchema.index(
  {
    tenantId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
  },
);

paymentSchema.index({
  tenantId: 1,
  branchId: 1,
  status: 1,
  createdAt: -1,
});

paymentSchema.index({
  tenantId: 1,
  providerId: 1,
  providerTransactionId: 1,
});

paymentSchema.index({
  tenantId: 1,
  orderId: 1,
  createdAt: -1,
});

export type PaymentDocument =
  HydratedDocument<
    InferSchemaType<typeof paymentSchema>
  >;

export const PaymentModel = model<PaymentDocument>(
  "Payment",
  paymentSchema,
);