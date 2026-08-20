import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

import {
  PAYMENT_PROVIDER_TYPES,
} from "../types/payment.types.js";

const paymentProviderSchema = new Schema(
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

    providerType: {
      type: String,
      enum: PAYMENT_PROVIDER_TYPES,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    credentials: {
      type: Schema.Types.Mixed,
      default: {},
    },

    configuration: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentProviderSchema.index(
  {
    tenantId: 1,
    branchId: 1,
    code: 1,
  },
  {
    unique: true,
  },
);

export type PaymentProviderDocument =
  InferSchemaType<typeof paymentProviderSchema>;

export const PaymentProviderModel =
  model<PaymentProviderDocument>(
    "PaymentProvider",
    paymentProviderSchema,
  );