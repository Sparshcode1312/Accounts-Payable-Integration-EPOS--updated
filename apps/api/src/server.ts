import { createServer } from "node:http";

import { createApp } from "./app.js";

import {
  connectDatabase,
  disconnectDatabase
} from "./config/database.js";

import { env } from "./config/env.js";

import { logger } from "./shared/logger/index.js";

const app = createApp();

const server = createServer(app);

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    server.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV
        },
        "Accounts & Payment API started"
      );
    });
  } catch (error) {
    logger.fatal(
      { err: error },
      "Failed to start Accounts & Payment API"
    );

    process.exit(1);
  }
}

async function shutdown(
  signal: string
): Promise<void> {
  logger.info(
    { signal },
    "Shutdown signal received"
  );

  server.close(async (error) => {
    if (error) {
      logger.error(
        { err: error },
        "Error while closing HTTP server"
      );

      process.exit(1);
    }

    try {
      await disconnectDatabase();

      logger.info(
        "Application shutdown completed"
      );

      process.exit(0);
    } catch (shutdownError) {
      logger.error(
        { err: shutdownError },
        "Error while disconnecting from MongoDB"
      );

      process.exit(1);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on(
  "unhandledRejection",
  (reason) => {
    logger.fatal(
      { reason },
      "Unhandled promise rejection"
    );

    process.exit(1);
  }
);

process.on(
  "uncaughtException",
  (error) => {
    logger.fatal(
      { err: error },
      "Uncaught exception"
    );

    process.exit(1);
  }
);

void bootstrap();