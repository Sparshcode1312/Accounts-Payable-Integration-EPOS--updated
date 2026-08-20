import type {
  WebhookEventType,
  WebhookProvider,
} from "../types/payment.types.js";

export interface ParsedWebhookEvent {
  eventId: string;
  eventType: WebhookEventType;
  providerTransactionId?: string;
  providerRefundId?: string;
  paymentId?: string;
  refundId?: string;
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringValue(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value.trim();
}

function mapRazorpayEvent(
  event: string,
): WebhookEventType | null {
  switch (event) {
    case "payment.created":
      return "PAYMENT_CREATED";

    case "payment.authorized":
      return "PAYMENT_AUTHORIZED";

    case "payment.captured":
      return "PAYMENT_CAPTURED";

    case "payment.failed":
      return "PAYMENT_FAILED";

    case "payment.cancelled":
      return "PAYMENT_CANCELLED";

    case "refund.created":
      return "REFUND_INITIATED";

    case "refund.processed":
      return "REFUND_COMPLETED";

    case "refund.failed":
      return "REFUND_FAILED";

    case "settlement.processed":
      return "SETTLEMENT_COMPLETED";

    default:
      return null;
  }
}

function mapStripeEvent(
  event: string,
  payload: Record<string, unknown>,
): WebhookEventType | null {
  switch (event) {
    case "payment_intent.created":
      return "PAYMENT_CREATED";

    case "payment_intent.amount_capturable_updated":
      return "PAYMENT_AUTHORIZED";

    case "payment_intent.succeeded":
      return "PAYMENT_CAPTURED";

    case "payment_intent.payment_failed":
      return "PAYMENT_FAILED";

    case "payment_intent.canceled":
      return "PAYMENT_CANCELLED";

    case "refund.created":
      return "REFUND_INITIATED";

    case "refund.updated": {
      const data =
        asRecord(payload.data);

      const object =
        asRecord(data.object);

      const status =
        stringValue(object.status);

      if (
        status === "failed" ||
        status === "canceled"
      ) {
        return "REFUND_FAILED";
      }

      if (status === "succeeded") {
        return "REFUND_COMPLETED";
      }

      return "REFUND_INITIATED";
    }

    default:
      return null;
  }
}

export function parseWebhookEvent(
  provider: WebhookProvider,
  payload: Record<string, unknown>,
  eventId: string,
): ParsedWebhookEvent | null {
  const eventName =
    stringValue(payload.event) ??
    stringValue(payload.type);

  if (!eventName) {
    return null;
  }

  const eventType =
    provider === "RAZORPAY"
      ? mapRazorpayEvent(eventName)
      : mapStripeEvent(
          eventName,
          payload,
        );

  if (!eventType) {
    return null;
  }

  if (provider === "RAZORPAY") {
    const rootPayload =
      asRecord(payload.payload);

    const paymentWrapper =
      asRecord(
        rootPayload.payment,
      );

    const payment =
      asRecord(
        paymentWrapper.entity,
      );

    const refundWrapper =
      asRecord(
        rootPayload.refund,
      );

    const refund =
      asRecord(
        refundWrapper.entity,
      );

    const providerTransactionId =
      stringValue(payment.order_id) ??
      stringValue(payment.id);

    const providerRefundId =
      stringValue(refund.id);

    return {
      eventId,

      eventType,

      ...(providerTransactionId
        ? {
            providerTransactionId,
          }
        : {}),

      ...(providerRefundId
        ? {
            providerRefundId,
          }
        : {}),
    };
  }

  const data =
    asRecord(payload.data);

  const object =
    asRecord(data.object);

  const metadata =
    asRecord(object.metadata);

  const providerTransactionId =
    stringValue(
      object.payment_intent,
    ) ??
    stringValue(object.id);

  const providerRefundId =
    stringValue(object.id);

  const paymentId =
    stringValue(
      metadata.paymentId,
    );

  const refundId =
    stringValue(
      metadata.refundId,
    );

  return {
    eventId,

    eventType,

    ...(providerTransactionId
      ? {
          providerTransactionId,
        }
      : {}),

    ...(eventType ===
      "REFUND_INITIATED" ||
    eventType ===
      "REFUND_COMPLETED" ||
    eventType ===
      "REFUND_FAILED"
      ? {
          providerRefundId,
        }
      : {}),

    ...(paymentId
      ? {
          paymentId,
        }
      : {}),

    ...(refundId
      ? {
          refundId,
        }
      : {}),
  };
}