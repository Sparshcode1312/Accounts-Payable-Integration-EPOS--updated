import { Router } from "express";

import {
  createPayment,
  getPayment,
  getPaymentStatus,
  capturePayment,
  listPayments,
   transitionPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.post(
  "/payments",
  createPayment,
);

router.get(
  "/payments",
  listPayments,
);

router.get(
  "/payments/:id",
  getPayment,
);

router.get(
  "/payments/:id/status",
  getPaymentStatus,
);

router.post(
  "/payments/:id/capture",
  capturePayment,
);

router.post(
  "/payments/:id/transition",
  transitionPayment,
);

export default router;