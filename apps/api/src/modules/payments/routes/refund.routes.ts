import { Router } from "express";

import {
  createRefund,
  getRefund,
  getPaymentRefunds,
} from "../controllers/refund.controller.js";

const router = Router();

/**
 * Create refund for a payment
 *
 * POST /api/v1/payments/:id/refund
 */
router.post(
  "/payments/:id/refund",
  createRefund,
);

/**
 * Get refund by ID
 *
 * GET /api/v1/refunds/:id
 */
router.get(
  "/refunds/:id",
  getRefund,
);

/**
 * Get all refunds for a payment
 *
 * GET /api/v1/payments/:id/refunds
 */
router.get(
  "/payments/:id/refunds",
  getPaymentRefunds,
);

export default router;