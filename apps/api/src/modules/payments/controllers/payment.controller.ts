import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

import {
  paymentService,
} from "../services/payment.service.js";

import {
  createPaymentSchema,
} from "../validators/payment.validator.js";

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

export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed =
      createPaymentSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message:
          "Invalid payment request",
        errors:
          parsed.error.flatten(),
      });

      return;
    }

    const data = parsed.data;

    if (
      !Types.ObjectId.isValid(
        data.tenantId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid tenantId",
      });

      return;
    }

    if (
      !Types.ObjectId.isValid(
        data.branchId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid branchId",
      });

      return;
    }

    if (
      !Types.ObjectId.isValid(
        data.orderId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid orderId",
      });

      return;
    }

    if (
      data.customerId &&
      !Types.ObjectId.isValid(
        data.customerId,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid customerId",
      });

      return;
    }

    if (
      data.providerId &&
      !Types.ObjectId.isValid(
        data.providerId,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid providerId",
      });

      return;
    }

    if (
      data.parentPaymentId &&
      !Types.ObjectId.isValid(
        data.parentPaymentId,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid parentPaymentId",
      });

      return;
    }

    const payment =
      await paymentService.createPayment({
        tenantId: data.tenantId,
        branchId: data.branchId,
        orderId: data.orderId,

        ...(data.customerId !== undefined
          ? {
              customerId:
                data.customerId,
            }
          : {}),

        paymentNumber:
          data.paymentNumber,

        method: data.method,

        ...(data.provider !== undefined
          ? {
              provider:
                data.provider,
            }
          : {}),

        ...(data.providerId !== undefined
          ? {
              providerId:
                data.providerId,
            }
          : {}),

        amount: data.amount,
        currency: data.currency,
        idempotencyKey:
          data.idempotencyKey,

        ...(data.parentPaymentId !==
        undefined
          ? {
              parentPaymentId:
                data.parentPaymentId,
            }
          : {}),

        ...(data.metadata !== undefined
          ? {
              metadata: data.metadata,
            }
          : {}),
      });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayment(
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
        message:
          "Invalid payment id",
      });

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
      !Types.ObjectId.isValid(
        tenantId,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid tenantId",
      });

      return;
    }

    const payment =
      await paymentService.getPayment(
        tenantId,
        id,
      );

    if (!payment) {
      res.status(404).json({
        success: false,
        message:
          "Payment not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentStatus(
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
        message:
          "Invalid payment id",
      });

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
      !Types.ObjectId.isValid(
        tenantId,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid tenantId",
      });

      return;
    }

    const payment =
      await paymentService.getPaymentStatus(
        tenantId,
        id,
      );

    if (!payment) {
      res.status(404).json({
        success: false,
        message:
          "Payment not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Capture an authorized/pending payment.
 *
 * POST /payments/:id/capture
 *
 * Optional body:
 * {
 *   "amount": "100.00"
 * }
 */
export async function capturePayment(
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
        message: "Invalid payment id",
      });

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
      !Types.ObjectId.isValid(
        tenantId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid tenantId",
      });

      return;
    }

    let amount: string | undefined;

    if (
      req.body?.amount !== undefined
    ) {
      if (
        typeof req.body.amount !==
          "string" &&
        typeof req.body.amount !==
          "number"
      ) {
        res.status(400).json({
          success: false,
          message:
            "amount must be a string or number",
        });

        return;
      }

      amount =
        String(req.body.amount);

      if (
        amount.trim().length === 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "amount cannot be empty",
        });

        return;
      }
    }

    const payment =
      await paymentService.capturePayment(
        tenantId,
        id,
        amount,
      );

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPayments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: "tenantId query parameter is required",
      });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({
        success: false,
        message: "Invalid tenantId",
      });
      return;
    }

    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const method = typeof req.query.method === "string" ? req.query.method : undefined;
    const provider = typeof req.query.provider === "string" ? req.query.provider : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    if (branchId && !Types.ObjectId.isValid(branchId)) {
      res.status(400).json({
        success: false,
        message: "Invalid branchId",
      });
      return;
    }

    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const result = await paymentService.listPayments(
      tenantId,
      { branchId, status, method, provider, fromDate, toDate },
      { page, limit },
    );

    res.status(200).json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}