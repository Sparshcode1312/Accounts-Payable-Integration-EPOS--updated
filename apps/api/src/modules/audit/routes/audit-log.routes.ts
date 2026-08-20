import { Router } from "express";

import {
  listAuditLogs,
  getEntityAuditTrail,
} from "../controllers/audit-log.controller.js";

const router = Router();

router.get(
  "/audit-logs",
  listAuditLogs,
);

router.get(
  "/audit-logs/:entityType/:entityId",
  getEntityAuditTrail,
);

export default router;
