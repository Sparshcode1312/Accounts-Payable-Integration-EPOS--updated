import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

import {
  INVOICE_STATUSES,
  INVOICE_TYPES,
  DISCOUNT_TYPES,
} from "../types/invoice.types.js";

const invoiceItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: false,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      required: false,
    },

    discountValue: {
      type: Schema.Types.Decimal128,
      required: false,
    },

    taxRate: {
      type: Schema.Types.Decimal128,
      required: false,
    },

    taxAmount: {
      type: Schema.Types.Decimal128,
      required: false,
    },

    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

const invoiceSchema = new Schema(
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

    customerId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceType: {
      type: String,
      enum: INVOICE_TYPES,
      required: true,
      default: "STANDARD",
      index: true,
    },

    status: {
      type: String,
      enum: INVOICE_STATUSES,
      required: true,
      default: "DRAFT",
      index: true,
    },

    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: false,
    },

    items: {
      type: [invoiceItemSchema],
      required: true,
      default: [],
    },

    subtotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    discountTotal: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    taxTotal: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    serviceCharge: {
      type: Schema.Types.Decimal128,
      required: false,
    },

    grandTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    amountPaid: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    amountDue: {
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

    notes: {
      type: String,
      required: false,
      trim: true,
    },

    referenceInvoiceId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    cancelledAt: {
      type: Date,
      required: false,
    },

    paidAt: {
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

invoiceSchema.index(
  { tenantId: 1, invoiceNumber: 1 },
  { unique: true },
);

invoiceSchema.index({
  tenantId: 1,
  branchId: 1,
  status: 1,
  createdAt: -1,
});

invoiceSchema.index({
  tenantId: 1,
  customerId: 1,
  createdAt: -1,
});

invoiceSchema.index({
  tenantId: 1,
  orderId: 1,
});

invoiceSchema.index({
  tenantId: 1,
  paymentId: 1,
});

export type InvoiceDocument =
  HydratedDocument<InferSchemaType<typeof invoiceSchema>>;

export const InvoiceModel =
  model<InvoiceDocument>("Invoice", invoiceSchema);
