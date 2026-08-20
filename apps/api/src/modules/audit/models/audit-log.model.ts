import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "PAYMENT_INITIATED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
  "PAYMENT_CANCELLED",
  "REFUND_INITIATED",
  "REFUND_COMPLETED",
  "REFUND_FAILED",
  "INVOICE_CREATED",
  "INVOICE_ISSUED",
  "INVOICE_CANCELLED",
  "INVOICE_PAYMENT_RECORDED",
  "WEBHOOK_RECEIVED",
  "WEBHOOK_PROCESSED",
  "CASH_ADJUSTMENT",
  "EXPENSE_APPROVED",
  "LEDGER_ADJUSTMENT",
  "RECONCILIATION_RESOLVED",
] as const;

const AUDIT_ENTITY_TYPES = [
  "PAYMENT",
  "REFUND",
  "INVOICE",
  "WEBHOOK",
  "PAYMENT_METHOD",
  "PAYMENT_PROVIDER",
  "ACCOUNT",
  "LEDGER_ENTRY",
  "EXPENSE",
  "CASH_DRAWER",
  "TAX_RATE",
  "RECONCILIATION",
] as const;

const auditLogSchema = new Schema(
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

    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPES,
      required: true,
      index: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    actorId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    actorType: {
      type: String,
      required: false,
      trim: true,
    },

    previousValue: {
      type: Schema.Types.Mixed,
      required: false,
    },

    newValue: {
      type: Schema.Types.Mixed,
      required: false,
    },

    description: {
      type: String,
      required: false,
      trim: true,
    },

    ipAddress: {
      type: String,
      required: false,
      trim: true,
    },

    userAgent: {
      type: String,
      required: false,
      trim: true,
    },

    requestId: {
      type: String,
      required: false,
      trim: true,
      index: true,
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

auditLogSchema.index({
  tenantId: 1,
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  tenantId: 1,
  action: 1,
  createdAt: -1,
});

auditLogSchema.index({
  tenantId: 1,
  actorId: 1,
  createdAt: -1,
});

export { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export type AuditLogDocument =
  HydratedDocument<InferSchemaType<typeof auditLogSchema>>;

export const AuditLogModel =
  model<AuditLogDocument>("AuditLog", auditLogSchema);
