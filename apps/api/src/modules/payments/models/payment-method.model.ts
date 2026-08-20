import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "../types/payment.types.js";

const paymentMethodSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    branchId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    requiresProvider: {
      type: Boolean,
      default: false,
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

paymentMethodSchema.index(
  {
    tenantId: 1,
    branchId: 1,
    code: 1,
  },
  {
    unique: true,
  },
);

export type PaymentMethodDocument =
  InferSchemaType<typeof paymentMethodSchema>;

export const PaymentMethodModel = model<
  PaymentMethodDocument
>("PaymentMethod", paymentMethodSchema);