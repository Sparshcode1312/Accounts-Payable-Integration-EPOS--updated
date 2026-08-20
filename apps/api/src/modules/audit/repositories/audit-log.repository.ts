import {
  Types,
  type ClientSession,
} from "mongoose";

import {
  AuditLogModel,
  type AuditLogDocument,
  type AuditAction,
  type AuditEntityType,
} from "../models/audit-log.model.js";

function toObjectId(
  value: string,
  fieldName: string,
): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(
      `Invalid ${fieldName}: ${value}`,
    );
  }

  return new Types.ObjectId(value);
}

export interface CreateAuditLogInput {
  tenantId: string;
  branchId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  actorId?: string;
  actorType?: string;
  previousValue?: unknown;
  newValue?: unknown;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogRepository {
  async create(
    input: CreateAuditLogInput,
    session?: ClientSession,
  ): Promise<AuditLogDocument> {
    const auditLog = new AuditLogModel({
      tenantId: toObjectId(input.tenantId, "tenantId"),

      ...(input.branchId
        ? { branchId: toObjectId(input.branchId, "branchId") }
        : {}),

      action: input.action,
      entityType: input.entityType,
      entityId: toObjectId(input.entityId, "entityId"),

      ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
      ...(input.actorType !== undefined ? { actorType: input.actorType } : {}),
      ...(input.previousValue !== undefined ? { previousValue: input.previousValue } : {}),
      ...(input.newValue !== undefined ? { newValue: input.newValue } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
      ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
      ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    });

    if (session) {
      await auditLog.save({ session });
    } else {
      await auditLog.save();
    }

    return auditLog;
  }

  async findByEntity(
    tenantId: string,
    entityType: AuditEntityType,
    entityId: string,
    pagination: { page?: number; limit?: number } = {},
  ): Promise<{ logs: AuditLogDocument[]; total: number; page: number; limit: number }> {
    const query = {
      tenantId: toObjectId(tenantId, "tenantId"),
      entityType,
      entityId: toObjectId(entityId, "entityId"),
    };

    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AuditLogModel.countDocuments(query).exec(),
    ]);

    return { logs, total, page, limit };
  }

  async findAll(
    tenantId: string,
    filters: {
      entityType?: string;
      action?: string;
      actorId?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
    pagination: { page?: number; limit?: number } = {},
  ): Promise<{ logs: AuditLogDocument[]; total: number; page: number; limit: number }> {
    const query: Record<string, unknown> = {
      tenantId: toObjectId(tenantId, "tenantId"),
    };

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.actorId) {
      query.actorId = filters.actorId;
    }

    if (filters.fromDate || filters.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.fromDate) {
        dateFilter.$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        dateFilter.$lte = new Date(filters.toDate);
      }
      query.createdAt = dateFilter;
    }

    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AuditLogModel.countDocuments(query).exec(),
    ]);

    return { logs, total, page, limit };
  }
}

export const auditLogRepository =
  new AuditLogRepository();
