import { Router } from "express";

import {
  receiveWebhook,
  getWebhook,
} from "../controllers/webhook.controller.js";

const router = Router();

router.post(
  "/webhooks/:provider",
  receiveWebhook,
);

router.get(
  "/webhooks/:id",
  getWebhook,
);

export default router;