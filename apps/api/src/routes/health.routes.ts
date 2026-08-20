import { Router } from "express";
import { isDatabaseReady } from "../config/database.js";

const router = Router();

router.get("/health", (_req, res) => {
  const databaseReady = isDatabaseReady();

  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    service: "accounts-payment-service",
    status: databaseReady
      ? "healthy"
      : "unhealthy",

    dependencies: {
      mongodb: databaseReady
        ? "healthy"
        : "unhealthy"
    }
  });
});

export default router;