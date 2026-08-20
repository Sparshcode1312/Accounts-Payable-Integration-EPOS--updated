import {
  Types,
  type ClientSession,
} from "mongoose";

import {
  InvoiceModel,
  type InvoiceDocument,
} from "../models/invoice.model.js";

import type {
  InvoiceStatus,
  InvoiceType,
} from "../types/invoice.types.js";

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

export interface InvoiceItemInput {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: string;
  discountType?: string;
  discountValue?: string;
  taxRate?: string;
  taxAmount?: string;
  totalAmount: string;
}

export interface CreateInvoiceRepositoryInput {
  tenantId: string;
  branchId: string;
  customerId?: string;
  orderId?: string;
  paymentId?: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status?: InvoiceStatus;
  issueDate?: Date;
  dueDate?: Date;
  items: InvoiceItemInput[];
  subtotal: string;
  discountTotal?: string;
  taxTotal?: string;
  serviceCharge?: string;
  grandTotal: string;
  amountPaid?: string;
  amountDue: string;
  currency: string;
  notes?: string;
  referenceInvoiceId?: string;
  metadata?: Record<string, unknown>;
}

export class InvoiceRepository {
  async create(
    input: CreateInvoiceRepositoryInput,
    session?: ClientSession,
  ): Promise<InvoiceDocument> {
    const invoice = new InvoiceModel({
      tenantId: toObjectId(input.tenantId, "tenantId"),
      branchId: toObjectId(input.branchId, "branchId"),

      ...(input.customerId
        ? { customerId: toObjectId(input.customerId, "customerId") }
        : {}),

      ...(input.orderId
        ? { orderId: toObjectId(input.orderId, "orderId") }
        : {}),

      ...(input.paymentId
        ? { paymentId: toObjectId(input.paymentId, "paymentId") }
        : {}),

      invoiceNumber: input.invoiceNumber,
      invoiceType: input.invoiceType,
      status: input.status ?? "DRAFT",

      ...(input.issueDate !== undefined
        ? { issueDate: input.issueDate }
        : {}),

      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate }
        : {}),

      items: input.items.map((item) => ({
        name: item.name,
        ...(item.description !== undefined ? { description: item.description } : {}),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(item.discountType !== undefined ? { discountType: item.discountType } : {}),
        ...(item.discountValue !== undefined ? { discountValue: item.discountValue } : {}),
        ...(item.taxRate !== undefined ? { taxRate: item.taxRate } : {}),
        ...(item.taxAmount !== undefined ? { taxAmount: item.taxAmount } : {}),
        totalAmount: item.totalAmount,
      })),

      subtotal: input.subtotal,
      discountTotal: input.discountTotal ?? "0",
      taxTotal: input.taxTotal ?? "0",

      ...(input.serviceCharge !== undefined
        ? { serviceCharge: input.serviceCharge }
        : {}),

      grandTotal: input.grandTotal,
      amountPaid: input.amountPaid ?? "0",
      amountDue: input.amountDue,
      currency: input.currency,

      ...(input.notes !== undefined
        ? { notes: input.notes }
        : {}),

      ...(input.referenceInvoiceId
        ? { referenceInvoiceId: toObjectId(input.referenceInvoiceId, "referenceInvoiceId") }
        : {}),

      ...(input.metadata !== undefined
        ? { metadata: input.metadata }
        : {}),
    });

    if (session) {
      await invoice.save({ session });
    } else {
      await invoice.save();
    }

    return invoice;
  }

  async findById(
    invoiceId: string,
    tenantId: string,
  ): Promise<InvoiceDocument | null> {
    return InvoiceModel.findOne({
      _id: toObjectId(invoiceId, "invoiceId"),
      tenantId: toObjectId(tenantId, "tenantId"),
    }).exec();
  }

  async findByInvoiceNumber(
    tenantId: string,
    invoiceNumber: string,
  ): Promise<InvoiceDocument | null> {
    return InvoiceModel.findOne({
      tenantId: toObjectId(tenantId, "tenantId"),
      invoiceNumber,
    }).exec();
  }

  async findAll(
    tenantId: string,
    filters: {
      branchId?: string;
      customerId?: string;
      orderId?: string;
      status?: string;
      invoiceType?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ invoices: InvoiceDocument[]; total: number; page: number; limit: number }> {
    const query: Record<string, unknown> = {
      tenantId: toObjectId(tenantId, "tenantId"),
    };

    if (filters.branchId) {
      query.branchId = toObjectId(filters.branchId, "branchId");
    }

    if (filters.customerId) {
      query.customerId = toObjectId(filters.customerId, "customerId");
    }

    if (filters.orderId) {
      query.orderId = toObjectId(filters.orderId, "orderId");
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.invoiceType) {
      query.invoiceType = filters.invoiceType;
    }

    if (filters.fromDate || filters.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.fromDate) {
        dateFilter.$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        dateFilter.$lte = new Date(filters.toDate);
      }
      query.createdAt = dateFilter;
    }

    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      InvoiceModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      InvoiceModel.countDocuments(query).exec(),
    ]);

    return { invoices, total, page, limit };
  }

  async updateStatus(
    invoiceId: string,
    tenantId: string,
    status: InvoiceStatus,
    extraFields: Record<string, unknown> = {},
    session?: ClientSession,
  ): Promise<InvoiceDocument | null> {
    const invoice = await InvoiceModel.findOne({
      _id: toObjectId(invoiceId, "invoiceId"),
      tenantId: toObjectId(tenantId, "tenantId"),
    }).exec();

    if (!invoice) {
      return null;
    }

    invoice.status = status;
    Object.assign(invoice, extraFields);

    if (session) {
      await invoice.save({ session });
    } else {
      await invoice.save();
    }

    return invoice;
  }

  async updateAmountPaid(
    invoiceId: string,
    tenantId: string,
    amountPaid: string,
    amountDue: string,
    status: InvoiceStatus,
    extraFields: Record<string, unknown> = {},
    session?: ClientSession,
  ): Promise<InvoiceDocument | null> {
    const invoice = await InvoiceModel.findOne({
      _id: toObjectId(invoiceId, "invoiceId"),
      tenantId: toObjectId(tenantId, "tenantId"),
    }).exec();

    if (!invoice) {
      return null;
    }

    invoice.amountPaid = amountPaid as unknown as Types.Decimal128;
    invoice.amountDue = amountDue as unknown as Types.Decimal128;
    invoice.status = status;
    Object.assign(invoice, extraFields);

    if (session) {
      await invoice.save({ session });
    } else {
      await invoice.save();
    }

    return invoice;
  }
}

export const invoiceRepository =
  new InvoiceRepository();
