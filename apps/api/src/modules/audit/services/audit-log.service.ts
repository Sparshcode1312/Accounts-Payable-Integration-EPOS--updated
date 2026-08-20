import {
  auditLogRepository,
  type CreateAuditLogInput,
} from "../repositories/audit-log.repository.js";

import type {
  AuditAction,
  AuditEntityType,
} from "../models/audit-log.model.js";

import { logger } from "../../../shared/logger/index.js";

export class AuditLogService {
  /**
   * Log an audit event. This method never throws — failures
   * are logged as warnings so they do not disrupt the main
   * business flow.
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await auditLogRepository.create(input);
    } catch (error) {
      logger.warn(
        { err: error, auditInput: input },
        "Failed to write audit log entry",
      );
    }
  }

  async getEntityAuditTrail(
    tenantId: string,
    entityType: AuditEntityType,
    entityId: string,
    pagination: { page?: number; limit?: number } = {},
  ) {
    return auditLogRepository.findByEntity(
      tenantId,
      entityType,
      entityId,
      pagination,
    );
  }

  async listAuditLogs(
    tenantId: string,
    filters: {
      entityType?: string;
      action?: string;
      actorId?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
    pagination: { page?: number; limit?: number } = {},
  ) {
    return auditLogRepository.findAll(
      tenantId,
      filters,
      pagination,
    );
  }
}

export const auditLogService =
  new AuditLogService();
