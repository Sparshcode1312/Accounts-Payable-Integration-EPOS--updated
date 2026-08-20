import {
  webhookRepository,
} from "../repositories/webhook.repository.js";

import type {
  WebhookEventType,
  WebhookProvider,
} from "../types/payment.types.js";

import { Types } from "mongoose";

import {
  paymentRepository,
} from "../repositories/payment.repository.js";

import {
  refundRepository,
} from "../repositories/refund.repository.js";

import {
  assertValidTransition,
  canTransition,
} from "./payment-state-machine.js";

import {
  auditLogService,
} from "../../audit/services/audit-log.service.js";

import {
  logger,
} from "../../../shared/logger/index.js";

export interface ReceiveProviderWebhookInput {
  provider: WebhookProvider;

  eventId: string;

  eventType: WebhookEventType;

  payload: Record<string, unknown>;

  signature: string;

  providerTransactionId?: string;

  providerRefundId?: string;

  paymentId?: string;

  refundId?: string;
}

export interface ReceiveWebhookInput {
  tenantId: string;
  provider: WebhookProvider;
  eventId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  signature?: string;
  paymentId?: string;
  refundId?: string;
  providerTransactionId?: string;
}

function isObjectId(
  value: string | undefined,
): value is string {
  return Boolean(
    value &&
    Types.ObjectId.isValid(value),
  );
}

function isStalePaymentEvent(
  current: string,
  target: string,
): boolean {
  const staleTargets:
    Record<string, string[]> = {
      AUTHORIZED: [
        "INITIATED",
        "PENDING",
      ],

      CAPTURED: [
        "INITIATED",
        "PENDING",
        "AUTHORIZED",
      ],

      SETTLED: [
        "INITIATED",
        "PENDING",
        "AUTHORIZED",
        "CAPTURED",
      ],

      PARTIALLY_REFUNDED: [
        "INITIATED",
        "PENDING",
        "AUTHORIZED",
        "CAPTURED",
        "SETTLED",
      ],

      REFUNDED: [
        "INITIATED",
        "PENDING",
        "AUTHORIZED",
        "CAPTURED",
        "SETTLED",
        "PARTIALLY_REFUNDED",
      ],
    };

  return (
    staleTargets[current]
      ?.includes(target) ??
    false
  );
}

function eventToPaymentStatus(
  eventType: WebhookEventType,
):
  | "INITIATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "SETTLED"
  | null {
  switch (eventType) {
    case "PAYMENT_CREATED":
      return "INITIATED";

    case "PAYMENT_AUTHORIZED":
      return "AUTHORIZED";

    case "PAYMENT_CAPTURED":
      return "CAPTURED";

    case "PAYMENT_FAILED":
      return "FAILED";

    case "PAYMENT_CANCELLED":
      return "CANCELLED";

    case "SETTLEMENT_COMPLETED":
      return "SETTLED";

    default:
      return null;
  }
}

function refundEventToStatus(
  eventType: WebhookEventType,
):
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | null {
  switch (eventType) {
    case "REFUND_INITIATED":
      return "PENDING";

    case "REFUND_COMPLETED":
      return "COMPLETED";

    case "REFUND_FAILED":
      return "FAILED";

    default:
      return null;
  }
}



export class WebhookService {

  async receiveProviderWebhook(
  input: ReceiveProviderWebhookInput,
) {
  const existing =
    await webhookRepository.findByEventId(
      input.provider,
      input.eventId,
    );

  if (existing) {
    if (
      existing.status ===
        "PROCESSED" ||
      existing.status ===
        "PROCESSING"
    ) {
      return {
        webhook: existing,
        duplicate: true,
      };
    }

    if (
      existing.status === "FAILED" ||
      existing.status === "RECEIVED"
    ) {
      const tenantId =
        existing.tenantId.toString();

      try {
        await this.processWebhook(
          existing._id.toString(),
          tenantId,
        );

        const processed =
          await webhookRepository.updateStatus(
            existing._id.toString(),
            tenantId,
            "PROCESSED",
            {
              processedAt:
                new Date(),
              errorMessage:
                undefined,
            },
          );

        return {
          webhook:
            processed ?? existing,
          duplicate: true,
        };
      } catch (error) {
        await webhookRepository.incrementRetryCount(
          existing._id.toString(),
          tenantId,
        );

        await webhookRepository.updateStatus(
          existing._id.toString(),
          tenantId,
          "FAILED",
          {
            failedAt:
              new Date(),
            errorMessage:
              error instanceof Error
                ? error.message
                : "Webhook processing failed",
          },
        );

        throw error;
      }
    }
  }

  let tenantId:
    | string
    | undefined;

  let paymentId =
    input.paymentId;

  let refundId =
    input.refundId;

  /*
   * First resolve the payment from
   * the provider transaction ID.
   */
  if (
    input.providerTransactionId
  ) {
    const payment =
      await paymentRepository.findByProviderTransactionIdAnyTenant(
        input.provider,
        input.providerTransactionId,
      );

    if (payment) {
      tenantId =
        payment.tenantId.toString();

      paymentId =
        payment._id.toString();
    }
  }

  /*
   * Stripe fallback:
   * paymentId may be present in metadata.
   */
  if (
    !tenantId &&
    input.provider === "STRIPE" &&
    isObjectId(input.paymentId)
  ) {
    const payment =
      await paymentRepository.findByIdAnyTenant(
        input.paymentId,
      );

    if (
      payment &&
      payment.provider ===
        "STRIPE"
    ) {
      tenantId =
        payment.tenantId.toString();

      paymentId =
        payment._id.toString();
    }
  }

  if (!tenantId) {
    throw new Error(
      "Unable to resolve tenant for verified provider webhook",
    );
  }

  const webhook =
    await webhookRepository.create({
      tenantId,

      provider:
        input.provider,

      eventId:
        input.eventId,

      eventType:
        input.eventType,

      payload:
        input.payload,

      signature:
        input.signature,

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

      ...(input.providerTransactionId
        ? {
            providerTransactionId:
              input.providerTransactionId,
          }
        : {}),

      ...(input.providerRefundId
        ? {
            providerRefundId:
              input.providerRefundId,
          }
        : {}),
    });

  try {
    await this.processWebhook(
      webhook._id.toString(),
      tenantId,
    );

    const processed =
      await webhookRepository.updateStatus(
        webhook._id.toString(),
        tenantId,
        "PROCESSED",
        {
          processedAt:
            new Date(),
        },
      );

    return {
      webhook:
        processed ?? webhook,
      duplicate: false,
    };
  } catch (error) {
    await webhookRepository.incrementRetryCount(
      webhook._id.toString(),
      tenantId,
    );

    await webhookRepository.updateStatus(
      webhook._id.toString(),
      tenantId,
      "FAILED",
      {
        failedAt:
          new Date(),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Webhook processing failed",
      },
    );

    throw error;
  }
}

private async processWebhook(
  webhookId: string,
  tenantId: string,
): Promise<void> {
  const webhook =
    await webhookRepository.updateStatus(
      webhookId,
      tenantId,
      "PROCESSING",
    );

  if (!webhook) {
    throw new Error(
      "Webhook not found while processing",
    );
  }

  const paymentStatus =
    eventToPaymentStatus(
      webhook.eventType,
    );

  if (paymentStatus) {
    if (
      !webhook.providerTransactionId
    ) {
      throw new Error(
        "Provider transaction ID is missing from webhook",
      );
    }

    const payment =
      await paymentRepository.findByProviderTransactionId(
        tenantId,
        webhook.providerTransactionId,
      );

    if (!payment) {
      throw new Error(
        `Payment not found for provider transaction ${webhook.providerTransactionId}`,
      );
    }

    const currentStatus =
      payment.status;

    if (
      currentStatus ===
      paymentStatus
    ) {
      return;
    }

    if (
      isStalePaymentEvent(
        currentStatus,
        paymentStatus,
      )
    ) {
      logger.info(
        {
          paymentId:
            payment._id.toString(),

          currentStatus,

          webhookStatus:
            paymentStatus,

          webhookId,
        },
        "Ignoring stale payment webhook event",
      );

      return;
    }

    if (
      !canTransition(
        currentStatus,
        paymentStatus,
      )
    ) {
      assertValidTransition(
        currentStatus,
        paymentStatus,
      );
    }

    const timestampFields:
      Record<string, unknown> = {};

    if (
      paymentStatus ===
      "CAPTURED"
    ) {
      timestampFields.capturedAt =
        new Date();
    }

    if (
      paymentStatus ===
      "SETTLED"
    ) {
      timestampFields.settledAt =
        new Date();
    }

    if (
      paymentStatus ===
      "FAILED"
    ) {
      timestampFields.failedAt =
        new Date();
    }

    if (
      paymentStatus ===
      "CANCELLED"
    ) {
      timestampFields.cancelledAt =
        new Date();
    }

    await paymentRepository.updateStatus(
      payment._id.toString(),
      tenantId,
      paymentStatus,
      timestampFields,
    );

    await auditLogService.log({
      tenantId,

      branchId:
        payment.branchId.toString(),

      action:
        paymentStatus ===
        "CAPTURED"
          ? "PAYMENT_CAPTURED"
          : paymentStatus ===
            "FAILED"
            ? "PAYMENT_FAILED"
            : paymentStatus ===
              "CANCELLED"
              ? "PAYMENT_CANCELLED"
              : "STATUS_CHANGE",

      entityType:
        "PAYMENT",

      entityId:
        payment._id.toString(),

      actorType:
        "SYSTEM",

      previousValue: {
        status:
          currentStatus,
      },

      newValue: {
        status:
          paymentStatus,
      },

      description:
        `Payment status updated by ${webhook.provider} webhook`,

      metadata: {
        webhookId,

        provider:
          webhook.provider,

        eventType:
          webhook.eventType,
      },
    });

    return;
  }

  const refundStatus =
    refundEventToStatus(
      webhook.eventType,
    );

  if (!refundStatus) {
    return;
  }

  let refund =
    webhook.refundId
      ? await refundRepository.findById(
          webhook.refundId.toString(),
          tenantId,
        )
      : null;

  if (
    !refund &&
    webhook.providerRefundId
  ) {
    refund =
      await refundRepository.findByProviderRefundId(
        tenantId,
        webhook.providerRefundId,
      );
  }

  if (!refund) {
    throw new Error(
      "Refund not found for webhook",
    );
  }

  if (
    refund.status ===
    refundStatus
  ) {
    return;
  }

  if (
    refund.status ===
      "COMPLETED" &&
    refundStatus ===
      "PENDING"
  ) {
    return;
  }

  const extraFields:
    Record<string, unknown> = {};

  if (
    refundStatus ===
    "COMPLETED"
  ) {
    extraFields.completedAt =
      new Date();
  }

  if (
    refundStatus ===
    "FAILED"
  ) {
    extraFields.failedAt =
      new Date();
  }

  await refundRepository.updateStatus(
    refund._id.toString(),
    tenantId,
    refundStatus,
    extraFields,
  );

  await auditLogService.log({
    tenantId,

    branchId:
      refund.branchId.toString(),

    action:
      refundStatus ===
      "COMPLETED"
        ? "REFUND_COMPLETED"
        : refundStatus ===
          "FAILED"
          ? "REFUND_FAILED"
          : "REFUND_INITIATED",

    entityType:
      "REFUND",

    entityId:
      refund._id.toString(),

    actorType:
      "SYSTEM",

    previousValue: {
      status:
        refund.status,
    },

    newValue: {
      status:
        refundStatus,
    },

    description:
      `Refund status updated by ${webhook.provider} webhook`,

    metadata: {
      webhookId,

      provider:
        webhook.provider,

      eventType:
        webhook.eventType,
    },
  });
}

  async receiveWebhook(
    input: ReceiveWebhookInput,
  ) {
    /*
     * 1. Check whether this provider event
     *    has already been received.
     *
     *    This provides webhook-level
     *    idempotency.
     */
    const existing =
      await webhookRepository.findByEventId(
        input.provider,
        input.eventId,
      );

    if (existing) {
      return {
        webhook: existing,
        duplicate: true,
      };
    }

    /*
     * 2. Store the webhook event.
     *
     *    Actual provider verification and
     *    business-event processing will be
     *    implemented in the next stage.
     */
    const webhook =
      await webhookRepository.create({
        tenantId:
          input.tenantId,

        provider:
          input.provider,

        eventId:
          input.eventId,

        eventType:
          input.eventType,

        payload:
          input.payload,

        ...(input.signature !==
        undefined
          ? {
              signature:
                input.signature,
            }
          : {}),

        ...(input.paymentId !==
        undefined
          ? {
              paymentId:
                input.paymentId,
            }
          : {}),

        ...(input.refundId !==
        undefined
          ? {
              refundId:
                input.refundId,
            }
          : {}),

        ...(input.providerTransactionId !==
        undefined
          ? {
              providerTransactionId:
                input.providerTransactionId,
            }
          : {}),
      });

    return {
      webhook,
      duplicate: false,
    };
  }

  async getWebhook(
    tenantId: string,
    webhookId: string,
  ) {
    return webhookRepository.findById(
      webhookId,
      tenantId,
    );
  }
}

export const webhookService =
  new WebhookService();