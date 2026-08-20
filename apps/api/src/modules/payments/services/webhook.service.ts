import {
  webhookRepository,
} from "../repositories/webhook.repository.js";

import type {
  WebhookEventType,
  WebhookProvider,
} from "../types/payment.types.js";

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

export class WebhookService {
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