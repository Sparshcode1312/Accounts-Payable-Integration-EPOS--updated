import { Router } from "express";

import {
  createInvoice,
  getInvoice,
  listInvoices,
  issueInvoice,
  cancelInvoice,
  recordPayment,
} from "../controllers/invoice.controller.js";

const router = Router();

router.get(
  "/invoices",
  listInvoices,
);

router.post(
  "/invoices",
  createInvoice,
);

router.get(
  "/invoices/:id",
  getInvoice,
);

router.post(
  "/invoices/:id/issue",
  issueInvoice,
);

router.post(
  "/invoices/:id/cancel",
  cancelInvoice,
);

router.post(
  "/invoices/:id/record-payment",
  recordPayment,
);

export default router;
