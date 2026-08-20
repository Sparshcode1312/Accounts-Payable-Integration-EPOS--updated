import type { ErrorRequestHandler } from "express";

import { AppError } from "../shared/errors/app-error.js";
import { logger } from "../shared/logger/index.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next
) => {
  const requestId =
    res.locals.requestId as string | undefined;

  if (error instanceof AppError) {
    logger.warn(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        err: error
      },
      error.message
    );

    res.status(error.statusCode).json({
      success: false,

      error: {
        code: error.code,
        message: error.message
      },

      requestId
    });

    return;
  }

  logger.error(
    {
      requestId,
      method: req.method,
      path: req.originalUrl,
      err: error
    },
    "Unhandled application error"
  );

  res.status(500).json({
    success: false,

    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred"
    },

    requestId
  });
};