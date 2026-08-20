import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Request } from "express";

import { env } from "./config/env.js";

import { requestIdMiddleware } from "./shared/utils/request-id.js";

import apiRoutes from "./routes/index.js";
import { apiRateLimiter, webhookRateLimiter } from "./middleware/rate-limiter.js";

import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );

  app.use(
    express.json({
      limit: "1mb",
      verify: (
      req: Request,
      _res,
      buf,
    ) => {
      if (
        req.originalUrl.startsWith(
          "/api/v1/webhooks/",
        )
      ) {
        req.rawBody =
          buf.toString("utf8");
      }
    },
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: "1mb"
    })
  );

  app.use(requestIdMiddleware);

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      service: "accounts-payment-service",
      version: "0.1.0"
    });
  });

  app.use("/api/v1/webhooks", webhookRateLimiter);
  app.use("/api/v1", apiRateLimiter);
  app.use("/api/v1", apiRoutes);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
}