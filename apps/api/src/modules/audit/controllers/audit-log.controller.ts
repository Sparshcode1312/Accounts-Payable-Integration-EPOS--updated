import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

import { auditLogService } from "../services/audit-log.service.js";

import type { AuditEntityType } from "../models/audit-log.model.js";
import { AUDIT_ENTITY_TYPES } from "../models/audit-log.model.js";

function getTenantId(
  req: Request,
): string | null {
  const tenantId = req.query.tenantId;

  if (
    typeof tenantId !== "string" ||
    tenantId.trim().length === 0
  ) {
    return null;
  }

  return tenantId;
}

export async function listAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: "tenantId query parameter is required",
      });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({
        success: false,
        message: "Invalid tenantId",
      });
      return;
    }

    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const actorId = typeof req.query.actorId === "string" ? req.query.actorId : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const result = await auditLogService.listAuditLogs(
      tenantId,
      { entityType, action, actorId, fromDate, toDate },
      { page, limit },
    );

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEntityAuditTrail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: "tenantId query parameter is required",
      });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({
        success: false,
        message: "Invalid tenantId",
      });
      return;
    }

    const { entityType, entityId } = req.params;

    if (
      typeof entityType !== "string" ||
      !(AUDIT_ENTITY_TYPES as readonly string[]).includes(entityType)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid entityType",
      });
      return;
    }

    if (
      typeof entityId !== "string" ||
      !Types.ObjectId.isValid(entityId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid entityId",
      });
      return;
    }

    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const result = await auditLogService.getEntityAuditTrail(
      tenantId,
      entityType as AuditEntityType,
      entityId,
      { page, limit },
    );

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
