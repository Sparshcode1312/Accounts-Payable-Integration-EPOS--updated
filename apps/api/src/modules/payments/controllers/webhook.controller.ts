import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

import {
  env,
} from "../../../config/env.js";

import {
  getWebhookVerifier,
} from "../providers/webhook-verifier.factory.js";

import {
  parseWebhookEvent,
} from "../providers/webhook-event.parser.js";

import type {
  WebhookProvider,
} from "../types/payment.types.js";

import {
  webhookService,
} from "../services/webhook.service.js";

import {
  receiveWebhookSchema,
} from "../validators/webhook.validator.js";

function validateObjectId(
  value: string,
  fieldName: string,
  res: Response,
): boolean {
  if (!Types.ObjectId.isValid(value)) {
    res.status(400).json({
      success: false,
      message: "Invalid " + fieldName,
    });

    return false;
  }

  return true;
}

function getHeader(
  req: Request,
  name: string,
): string | undefined {
  const value =
    req.header(name);

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value.trim();
}

function parseRawPayload(
  rawBody: string,
): Record<string, unknown> | null {
  try {
    const parsed: unknown =
      JSON.parse(rawBody);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProviderFromParam(
  value:
    | string
    | string[]
    | undefined,
): WebhookProvider | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const provider =
    value.toUpperCase();

  if (
    provider === "RAZORPAY" ||
    provider === "STRIPE"
  ) {
    return provider;
  }

  return null;
}

export async function receiveWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    /*
     * Existing local/test webhook contract.
     * Keep this working in development/test.
     */
    if (
      env.NODE_ENV !== "production" &&
      req.body !== null &&
      typeof req.body === "object" &&
      !Array.isArray(req.body) &&
      typeof (
        req.body as Record<
          string,
          unknown
        >
      ).tenantId === "string"
    ) {
      return receiveLegacyWebhook(
        req,
        res,
        next,
      );
    }

    const provider =
      getProviderFromParam(
        req.params.provider,
      );

    if (!provider) {
      res.status(400).json({
        success: false,
        message:
          "Unsupported webhook provider",
      });

      return;
    }

    const rawBody =
      req.rawBody;

    if (
      typeof rawBody !== "string" ||
      rawBody.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "Raw webhook body is required",
      });

      return;
    }

    const signature =
      provider === "RAZORPAY"
        ? getHeader(
            req,
            "x-razorpay-signature",
          )
        : getHeader(
            req,
            "stripe-signature",
          );

    if (!signature) {
      res.status(400).json({
        success: false,
        message:
          "Webhook signature is required",
      });

      return;
    }

    const verifier =
      getWebhookVerifier(
        provider,
      );

    const valid =
      verifier.verifySignature({
        payload: rawBody,
        signature,
      });

    if (!valid) {
      res.status(400).json({
        success: false,
        message:
          "Invalid webhook signature",
      });

      return;
    }

    const payload =
      parseRawPayload(
        rawBody,
      );

    if (!payload) {
      res.status(400).json({
        success: false,
        message:
          "Invalid webhook JSON payload",
      });

      return;
    }

    const eventId =
      provider === "RAZORPAY"
        ? getHeader(
            req,
            "x-razorpay-event-id",
          )
        : typeof payload.id ===
            "string"
          ? payload.id
          : undefined;

    if (!eventId) {
      res.status(400).json({
        success: false,
        message:
          "Webhook event ID is required",
      });

      return;
    }

    const parsed =
      parseWebhookEvent(
        provider,
        payload,
        eventId,
      );

    if (!parsed) {
      res.status(200).json({
        success: true,
        ignored: true,
        message:
          "Webhook event is not handled",
      });

      return;
    }

    const result =
      await webhookService.receiveProviderWebhook({
        provider,

        eventId:
          parsed.eventId,

        eventType:
          parsed.eventType,

        payload,

        signature,

        ...(parsed.providerTransactionId
          ? {
              providerTransactionId:
                parsed.providerTransactionId,
            }
          : {}),

        ...(parsed.providerRefundId
          ? {
              providerRefundId:
                parsed.providerRefundId,
            }
          : {}),

        ...(parsed.paymentId
          ? {
              paymentId:
                parsed.paymentId,
            }
          : {}),

        ...(parsed.refundId
          ? {
              refundId:
                parsed.refundId,
            }
          : {}),
      });

    res.status(200).json({
      success: true,
      duplicate:
        result.duplicate,
      data:
        result.webhook,
    });
  } catch (error) {
    next(error);
  }
}

async function receiveLegacyWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed =
      receiveWebhookSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message:
          "Invalid webhook request",
        errors:
          parsed.error.flatten(),
      });

      return;
    }

    const data =
      parsed.data;

    if (
      !validateObjectId(
        data.tenantId,
        "tenantId",
        res,
      )
    ) {
      return;
    }

    if (
      data.paymentId !==
        undefined &&
      !validateObjectId(
        data.paymentId,
        "paymentId",
        res,
      )
    ) {
      return;
    }

    if (
      data.refundId !==
        undefined &&
      !validateObjectId(
        data.refundId,
        "refundId",
        res,
      )
    ) {
      return;
    }

    const result =
      await webhookService.receiveWebhook({
        tenantId:
          data.tenantId,

        provider:
          data.provider,

        eventId:
          data.eventId,

        eventType:
          data.eventType,

        payload:
          data.payload,

        ...(data.signature !==
        undefined
          ? {
              signature:
                data.signature,
            }
          : {}),

        ...(data.paymentId !==
        undefined
          ? {
              paymentId:
                data.paymentId,
            }
          : {}),

        ...(data.refundId !==
        undefined
          ? {
              refundId:
                data.refundId,
            }
          : {}),

        ...(data.providerTransactionId !==
        undefined
          ? {
              providerTransactionId:
                data.providerTransactionId,
            }
          : {}),
      });

    res
      .status(
        result.duplicate
          ? 200
          : 201,
      )
      .json({
        success: true,
        duplicate:
          result.duplicate,
        data:
          result.webhook,
      });
  } catch (error) {
    next(error);
  }
}

export async function getWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (
      typeof id !== "string" ||
      !Types.ObjectId.isValid(id)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid webhook id",
      });

      return;
    }

    const tenantId =
      req.query.tenantId;

    if (
      typeof tenantId !== "string" ||
      tenantId.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "tenantId query parameter is required",
      });

      return;
    }

    if (
      !validateObjectId(
        tenantId,
        "tenantId",
        res,
      )
    ) {
      return;
    }

    const webhook =
      await webhookService.getWebhook(
        tenantId,
        id,
      );

    if (!webhook) {
      res.status(404).json({
        success: false,
        message: "Webhook not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    next(error);
  }
}