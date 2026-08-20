import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentFile = fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFile);

// accounts-payment-service/.env
const projectRoot = path.resolve(
  currentDirectory,
  "../../../..",
);

dotenv.config({
  path: path.join(
    projectRoot,
    ".env",
  ),
});

const envSchema = z.object({
  NODE_ENV: z
    .enum([
      "development",
      "test",
      "production",
    ])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5000),

  MONGODB_URI: z
    .string()
    .min(
      1,
      "MONGODB_URI is required",
    ),

  CORS_ORIGIN: z
    .string()
    .min(1)
    .default(
      "http://localhost:5173",
    ),

  LOG_LEVEL: z
    .enum([
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
    ])
    .default("info"),

  DNS_SERVERS: z
    .string()
    .optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z
    .string()
    .optional(),

  RAZORPAY_KEY_SECRET: z
    .string()
    .optional(),

  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .optional(),

  // Stripe
  STRIPE_SECRET_KEY: z
    .string()
    .optional(),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional(),
});

const parsed =
  envSchema.safeParse(
    process.env,
  );

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
  );

  console.error(
    parsed.error.issues,
  );

  process.exit(1);
}

export const env = parsed.data;