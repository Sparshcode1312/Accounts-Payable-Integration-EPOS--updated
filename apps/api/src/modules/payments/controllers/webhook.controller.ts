import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

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

export async function receiveWebhook(
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
        message: "Invalid webhook request",
        errors: parsed.error.flatten(),
      });

      return;
    }

    const data = parsed.data;

    // Validate tenantId
    if (
      !validateObjectId(
        data.tenantId,
        "tenantId",
        res,
      )
    ) {
      return;
    }

    // Validate paymentId if provided
    if (
      data.paymentId !== undefined &&
      !validateObjectId(
        data.paymentId,
        "paymentId",
        res,
      )
    ) {
      return;
    }

    // Validate refundId if provided
    if (
      data.refundId !== undefined &&
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
        tenantId: data.tenantId,

        provider: data.provider,

        eventId: data.eventId,

        eventType: data.eventType,

        payload: data.payload,

        ...(data.signature !== undefined
          ? {
              signature: data.signature,
            }
          : {}),

        ...(data.paymentId !== undefined
          ? {
              paymentId: data.paymentId,
            }
          : {}),

        ...(data.refundId !== undefined
          ? {
              refundId: data.refundId,
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

    // Duplicate webhook
    if (result.duplicate) {
      res.status(200).json({
        success: true,
        duplicate: true,
        data: result.webhook,
      });

      return;
    }

    // New webhook
    res.status(201).json({
      success: true,
      duplicate: false,
      data: result.webhook,
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