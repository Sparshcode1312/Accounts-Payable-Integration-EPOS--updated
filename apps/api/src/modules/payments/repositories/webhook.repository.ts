import {
  Types,
  type ClientSession,
} from "mongoose";

import {
  WebhookModel,
  type WebhookDocument,
} from "../models/webhook.model.js";

import type {
  WebhookProvider,
  WebhookStatus,
  WebhookEventType,
} from "../types/payment.types.js";

export interface CreateWebhookRepositoryInput {
  tenantId: string;
  provider: WebhookProvider;
  eventId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  signature?: string;
  paymentId?: string;
  refundId?: string;
  providerTransactionId?: string;
  providerRefundId?: string;
}

function toObjectId(
  value: string,
  fieldName: string,
): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(
      `Invalid ${fieldName}: ${value}`,
    );
  }

  return new Types.ObjectId(value);
}

export class WebhookRepository {
  async create(
    input: CreateWebhookRepositoryInput,
    session?: ClientSession,
  ): Promise<WebhookDocument> {
    const webhook =
      new WebhookModel({
        tenantId: toObjectId(
          input.tenantId,
          "tenantId",
        ),

        provider: input.provider,

        eventId: input.eventId,

        eventType: input.eventType,

        payload: input.payload,

        ...(input.signature
          ? {
              signature:
                input.signature,
            }
          : {}),

        ...(input.paymentId
          ? {
              paymentId:
                toObjectId(
                  input.paymentId,
                  "paymentId",
                ),
            }
          : {}),

        ...(input.refundId
          ? {
              refundId:
                toObjectId(
                  input.refundId,
                  "refundId",
                ),
            }
          : {}),

        ...(input.providerTransactionId
          ? {
              providerTransactionId:
                input.providerTransactionId,
            }
          : {}),

          ...(input.providerRefundId !==
undefined
  ? {
      providerRefundId:
        input.providerRefundId,
    }
  : {}),

        status: "RECEIVED",
      });

    if (session) {
      await webhook.save({ session });
    } else {
      await webhook.save();
    }

    return webhook;
  }

  async findByEventId(
    provider: WebhookProvider,
    eventId: string,
  ): Promise<WebhookDocument | null> {
    return WebhookModel.findOne({
      provider,
      eventId,
    }).exec();
  }

  async findById(
    webhookId: string,
    tenantId: string,
  ): Promise<WebhookDocument | null> {
    return WebhookModel.findOne({
      _id: toObjectId(
        webhookId,
        "webhookId",
      ),
      tenantId: toObjectId(
        tenantId,
        "tenantId",
      ),
    }).exec();
  }

  async updateStatus(
    webhookId: string,
    tenantId: string,
    status: WebhookStatus,
    extraFields: Record<
      string,
      unknown
    > = {},
    session?: ClientSession,
  ): Promise<WebhookDocument | null> {
    const webhook =
      await WebhookModel.findOne({
        _id: toObjectId(
          webhookId,
          "webhookId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      }).exec();

    if (!webhook) {
      return null;
    }

    webhook.status = status;

    Object.assign(
      webhook,
      extraFields,
    );

    if (session) {
      await webhook.save({ session });
    } else {
      await webhook.save();
    }

    return webhook;
  }

  async incrementRetryCount(
    webhookId: string,
    tenantId: string,
  ): Promise<WebhookDocument | null> {
    return WebhookModel.findOneAndUpdate(
      {
        _id: toObjectId(
          webhookId,
          "webhookId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      },
      {
        $inc: {
          retryCount: 1,
        },
      },
      {
        new: true,
      },
    ).exec();
  }
}

export const webhookRepository =
  new WebhookRepository();