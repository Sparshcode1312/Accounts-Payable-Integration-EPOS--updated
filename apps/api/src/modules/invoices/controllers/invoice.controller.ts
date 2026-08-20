import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

import {
  invoiceService,
} from "../services/invoice.service.js";

import {
  createInvoiceSchema,
  cancelInvoiceSchema,
  recordPaymentSchema,
} from "../validators/invoice.validator.js";

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

export async function createInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid invoice request",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const data = parsed.data;

    if (!Types.ObjectId.isValid(data.tenantId)) {
      res.status(400).json({ success: false, message: "Invalid tenantId" });
      return;
    }

    if (!Types.ObjectId.isValid(data.branchId)) {
      res.status(400).json({ success: false, message: "Invalid branchId" });
      return;
    }

    if (data.customerId && !Types.ObjectId.isValid(data.customerId)) {
      res.status(400).json({ success: false, message: "Invalid customerId" });
      return;
    }

    if (data.orderId && !Types.ObjectId.isValid(data.orderId)) {
      res.status(400).json({ success: false, message: "Invalid orderId" });
      return;
    }

    if (data.paymentId && !Types.ObjectId.isValid(data.paymentId)) {
      res.status(400).json({ success: false, message: "Invalid paymentId" });
      return;
    }

    if (data.referenceInvoiceId && !Types.ObjectId.isValid(data.referenceInvoiceId)) {
      res.status(400).json({ success: false, message: "Invalid referenceInvoiceId" });
      return;
    }

    const invoice = await invoiceService.createInvoice({
      tenantId: data.tenantId,
      branchId: data.branchId,

      ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
      ...(data.orderId !== undefined ? { orderId: data.orderId } : {}),
      ...(data.paymentId !== undefined ? { paymentId: data.paymentId } : {}),
      ...(data.invoiceType !== undefined ? { invoiceType: data.invoiceType } : {}),
      ...(data.issueDate !== undefined ? { issueDate: data.issueDate } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),

      items: data.items.map((item) => ({
        name: item.name,
        ...(item.description !== undefined ? { description: item.description } : {}),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(item.discountType !== undefined ? { discountType: item.discountType } : {}),
        ...(item.discountValue !== undefined ? { discountValue: item.discountValue } : {}),
        ...(item.taxRate !== undefined ? { taxRate: item.taxRate } : {}),
        ...(item.taxAmount !== undefined ? { taxAmount: item.taxAmount } : {}),
        totalAmount: item.totalAmount ?? "0",
      })),

      ...(data.serviceCharge !== undefined ? { serviceCharge: data.serviceCharge } : {}),
      currency: data.currency,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.referenceInvoiceId !== undefined ? { referenceInvoiceId: data.referenceInvoiceId } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid invoice id" });
      return;
    }

    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({ success: false, message: "tenantId query parameter is required" });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, message: "Invalid tenantId" });
      return;
    }

    const invoice = await invoiceService.getInvoice(tenantId, id);

    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function listInvoices(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({ success: false, message: "tenantId query parameter is required" });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, message: "Invalid tenantId" });
      return;
    }

    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;
    const orderId = typeof req.query.orderId === "string" ? req.query.orderId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const invoiceType = typeof req.query.invoiceType === "string" ? req.query.invoiceType : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    if (branchId && !Types.ObjectId.isValid(branchId)) {
      res.status(400).json({ success: false, message: "Invalid branchId" });
      return;
    }

    if (customerId && !Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ success: false, message: "Invalid customerId" });
      return;
    }

    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const result = await invoiceService.listInvoices(
      tenantId,
      { branchId, customerId, orderId, status, invoiceType, fromDate, toDate },
      { page, limit },
    );

    res.status(200).json({
      success: true,
      data: result.invoices,
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

export async function issueInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid invoice id" });
      return;
    }

    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({ success: false, message: "tenantId query parameter is required" });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, message: "Invalid tenantId" });
      return;
    }

    const invoice = await invoiceService.issueInvoice(tenantId, id);

    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function cancelInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid invoice id" });
      return;
    }

    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({ success: false, message: "tenantId query parameter is required" });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, message: "Invalid tenantId" });
      return;
    }

    const parsed = cancelInvoiceSchema.safeParse(req.body);
    const reason = parsed.success ? parsed.data.reason : undefined;

    const invoice = await invoiceService.cancelInvoice(tenantId, id, reason);

    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function recordPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid invoice id" });
      return;
    }

    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({ success: false, message: "tenantId query parameter is required" });
      return;
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, message: "Invalid tenantId" });
      return;
    }

    const parsed = recordPaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid payment record request",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const invoice = await invoiceService.recordPayment(
      tenantId,
      id,
      parsed.data.amount,
      parsed.data.paymentId,
    );

    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}
