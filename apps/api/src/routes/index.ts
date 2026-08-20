import { Router } from "express";

import healthRoutes from "./health.routes.js";

import paymentRoutes from "../modules/payments/routes/payment.routes.js";
import refundRoutes from "../modules/payments/routes/refund.routes.js";
import webhookRoutes from "../modules/payments/routes/webhook.routes.js";
import auditRoutes from "../modules/audit/routes/audit-log.routes.js";
import invoiceRoutes from "../modules/invoices/routes/invoice.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(paymentRoutes);
router.use(refundRoutes);
router.use(webhookRoutes);
router.use(invoiceRoutes);
router.use(auditRoutes);

export default router;