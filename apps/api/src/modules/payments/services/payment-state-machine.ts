import type { PaymentStatus } from "../types/payment.types.js";

const transitions: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  INITIATED: [
    "PENDING",
    "CANCELLED",
    "EXPIRED",
  ],

  PENDING: [
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "CANCELLED",
    "EXPIRED",
  ],

  AUTHORIZED: [
    "CAPTURED",
    "FAILED",
    "CANCELLED",
  ],

  CAPTURED: [
    "SETTLED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ],

  SETTLED: [
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ],

  FAILED: [],

  CANCELLED: [],

  EXPIRED: [],

  REFUNDED: [],

  PARTIALLY_REFUNDED: [
    "REFUNDED",
  ],
};

export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertValidTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid payment status transition: ${from} -> ${to}`,
    );
  }
}