import { Router } from "express";
import express from "express";

import {
  receiveWebhook,
  getWebhook,
} from "../controllers/webhook.controller.js";

const router = Router();

router.post(
  "/webhooks/:provider",
  express.raw({ type: "application/json" }),
  receiveWebhook,
);


router.get(
  "/webhooks/:id",
  getWebhook,
);

export default router;