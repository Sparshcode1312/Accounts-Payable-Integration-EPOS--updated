import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

import {
  refundService,
} from "../services/refund.service.js";

import {
  createRefundSchema,
} from "../validators/refund.validator.js";

function getTenantId(
  req: Request,
): string | null {
  const tenantId = req.query.tenantId;

  if (
    typeof tenantId !== "string" ||
    tenantId.trim().length === 0
  ) {
    return null;
  }

  return tenantId;
}

function validateObjectId(
  value: string,
  fieldName: string,
  res: Response,
): boolean {
  if (!Types.ObjectId.isValid(value)) {
    res.status(400).json({
      success: false,
      message: `Invalid ${fieldName}`,
    });

    return false;
  }

  return true;
}

export async function createRefund(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (
      typeof id !== "string" ||
      !validateObjectId(
        id,
        "payment id",
        res,
      )
    ) {
      return;
    }

    const parsed =
      createRefundSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message:
          "Invalid refund request",
        errors:
          parsed.error.flatten(),
      });

      return;
    }

    const data = parsed.data;

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
      !validateObjectId(
        data.branchId,
        "branchId",
        res,
      )
    ) {
      return;
    }

    const refund =
      await refundService.createRefund({
        tenantId:
          data.tenantId,

        branchId:
          data.branchId,

        paymentId: id,

        type: data.type,

        amount: data.amount,

        ...(data.reason !== undefined
          ? {
              reason:
                data.reason,
            }
          : {}),

        ...(data.metadata !== undefined
          ? {
              metadata:
                data.metadata,
            }
          : {}),
      });

    res.status(201).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRefund(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (
      typeof id !== "string" ||
      !validateObjectId(
        id,
        "refund id",
        res,
      )
    ) {
      return;
    }

    const tenantId =
      getTenantId(req);

    if (!tenantId) {
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

    const refund =
      await refundService.getRefund(
        tenantId,
        id,
      );

    if (!refund) {
      res.status(404).json({
        success: false,
        message:
          "Refund not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentRefunds(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (
      typeof id !== "string" ||
      !validateObjectId(
        id,
        "payment id",
        res,
      )
    ) {
      return;
    }

    const tenantId =
      getTenantId(req);

    if (!tenantId) {
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

    const refunds =
      await refundService.getPaymentRefunds(
        tenantId,
        id,
      );

    res.status(200).json({
      success: true,
      data: refunds,
    });
  } catch (error) {
    next(error);
  }
}