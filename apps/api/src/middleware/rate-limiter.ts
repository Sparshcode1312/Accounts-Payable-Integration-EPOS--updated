import type {
  Request,
  Response,
  NextFunction,
} from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

/**
 * Simple in-memory rate limiter.
 *
 * For production use, replace with a Redis-backed
 * implementation or the express-rate-limit package.
 * This implementation is dependency-free and suitable
 * for single-instance deployments.
 */
export function createRateLimiter(
  options: RateLimiterOptions,
) {
  const { windowMs, maxRequests, message } = options;

  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetTime) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Allow the timer to not prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const key =
      req.ip ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      store.set(key, entry);
    }

    entry.count += 1;

    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > maxRequests) {
      res.status(429).json({
        success: false,
        message: message ?? "Too many requests, please try again later",
      });
      return;
    }

    next();
  };
}

/** Standard API rate limiter: 100 requests per 15 minutes */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

/** Webhook rate limiter: 500 requests per 15 minutes (higher limit for webhooks) */
export const webhookRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 500,
  message: "Too many webhook requests",
});

/** Auth rate limiter: 20 requests per 15 minutes (strict for auth endpoints) */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts",
});
