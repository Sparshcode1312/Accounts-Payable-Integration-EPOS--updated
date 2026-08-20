import { invoiceRepository } from "../repositories/invoice.repository.js";

import type {
  InvoiceType,
  InvoiceStatus,
} from "../types/invoice.types.js";

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

export interface CreateInvoiceInput {
  tenantId: string;
  branchId: string;
  customerId?: string;
  orderId?: string;
  paymentId?: string;
  invoiceType?: InvoiceType;
  issueDate?: string;
  dueDate?: string;
  items: InvoiceItemInput[];
  serviceCharge?: string;
  currency: string;
  notes?: string;
  referenceInvoiceId?: string;
  metadata?: Record<string, unknown>;
}

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function calculateItemTotals(
  items: InvoiceItemInput[],
): {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  computedItems: InvoiceItemInput[];
} {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const computedItems = items.map((item) => {
    const lineSubtotal = item.quantity * Number(item.unitPrice);

    let itemDiscount = 0;
    if (item.discountType && item.discountValue) {
      const discountVal = Number(item.discountValue);
      if (item.discountType === "PERCENTAGE") {
        itemDiscount = (lineSubtotal * discountVal) / 100;
      } else {
        itemDiscount = discountVal;
      }
    }

    const afterDiscount = lineSubtotal - itemDiscount;

    let itemTax = 0;
    if (item.taxRate) {
      const taxRate = Number(item.taxRate);
      itemTax = (afterDiscount * taxRate) / 100;
    }

    const itemTotal = afterDiscount + itemTax;

    subtotal += lineSubtotal;
    discountTotal += itemDiscount;
    taxTotal += itemTax;

    return {
      ...item,
      taxAmount: item.taxAmount ?? itemTax.toFixed(2),
      totalAmount: item.totalAmount ?? itemTotal.toFixed(2),
    };
  });

  const grandTotal = subtotal - discountTotal + taxTotal;

  return {
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    computedItems,
  };
}

export class InvoiceService {
  async createInvoice(
    input: CreateInvoiceInput,
  ) {
    if (input.items.length === 0) {
      throw new Error("Invoice must have at least one item");
    }

    const { subtotal, discountTotal, taxTotal, grandTotal, computedItems } =
      calculateItemTotals(input.items);

    const serviceChargeAmount = input.serviceCharge
      ? Number(input.serviceCharge)
      : 0;

    const finalTotal = grandTotal + serviceChargeAmount;

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await invoiceRepository.create({
      tenantId: input.tenantId,
      branchId: input.branchId,

      ...(input.customerId !== undefined
        ? { customerId: input.customerId }
        : {}),

      ...(input.orderId !== undefined
        ? { orderId: input.orderId }
        : {}),

      ...(input.paymentId !== undefined
        ? { paymentId: input.paymentId }
        : {}),

      invoiceNumber,
      invoiceType: input.invoiceType ?? "STANDARD",
      status: "DRAFT",

      ...(input.issueDate !== undefined
        ? { issueDate: new Date(input.issueDate) }
        : {}),

      ...(input.dueDate !== undefined
        ? { dueDate: new Date(input.dueDate) }
        : {}),

      items: computedItems,

      subtotal: subtotal.toFixed(2),
      discountTotal: discountTotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),

      ...(input.serviceCharge !== undefined
        ? { serviceCharge: serviceChargeAmount.toFixed(2) }
        : {}),

      grandTotal: finalTotal.toFixed(2),
      amountPaid: "0.00",
      amountDue: finalTotal.toFixed(2),
      currency: input.currency,

      ...(input.notes !== undefined
        ? { notes: input.notes }
        : {}),

      ...(input.referenceInvoiceId !== undefined
        ? { referenceInvoiceId: input.referenceInvoiceId }
        : {}),

      ...(input.metadata !== undefined
        ? { metadata: input.metadata }
        : {}),
    });

    return invoice;
  }

  async getInvoice(
    tenantId: string,
    invoiceId: string,
  ) {
    return invoiceRepository.findById(
      invoiceId,
      tenantId,
    );
  }

  async listInvoices(
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
  ) {
    return invoiceRepository.findAll(
      tenantId,
      filters,
      pagination,
    );
  }

  async issueInvoice(
    tenantId: string,
    invoiceId: string,
  ) {
    const invoice = await invoiceRepository.findById(
      invoiceId,
      tenantId,
    );

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "DRAFT") {
      throw new Error(
        `Invoice cannot be issued from status: ${invoice.status}`,
      );
    }

    return invoiceRepository.updateStatus(
      invoiceId,
      tenantId,
      "ISSUED",
      { issueDate: new Date() },
    );
  }

  async cancelInvoice(
    tenantId: string,
    invoiceId: string,
    reason?: string,
  ) {
    const invoice = await invoiceRepository.findById(
      invoiceId,
      tenantId,
    );

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (
      invoice.status === "CANCELLED" ||
      invoice.status === "PAID"
    ) {
      throw new Error(
        `Invoice cannot be cancelled from status: ${invoice.status}`,
      );
    }

    const extraFields: Record<string, unknown> = {
      cancelledAt: new Date(),
    };

    if (reason) {
      extraFields.notes =
        (invoice.notes ? invoice.notes + "\n" : "") +
        `Cancelled: ${reason}`;
    }

    return invoiceRepository.updateStatus(
      invoiceId,
      tenantId,
      "CANCELLED",
      extraFields,
    );
  }

  async recordPayment(
    tenantId: string,
    invoiceId: string,
    amount: string,
    paymentId?: string,
  ) {
    const invoice = await invoiceRepository.findById(
      invoiceId,
      tenantId,
    );

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (
      invoice.status !== "ISSUED" &&
      invoice.status !== "PARTIALLY_PAID" &&
      invoice.status !== "OVERDUE"
    ) {
      throw new Error(
        `Cannot record payment for invoice in status: ${invoice.status}`,
      );
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    const currentPaid = Number(invoice.amountPaid.toString());
    const total = Number(invoice.grandTotal.toString());
    const newPaid = currentPaid + paymentAmount;
    const newDue = total - newPaid;

    let newStatus: InvoiceStatus;

    if (newDue <= 0) {
      newStatus = "PAID";
    } else {
      newStatus = "PARTIALLY_PAID";
    }

    const extraFields: Record<string, unknown> = {};

    if (newStatus === "PAID") {
      extraFields.paidAt = new Date();
    }

    if (paymentId) {
      extraFields.paymentId = paymentId;
    }

    return invoiceRepository.updateAmountPaid(
      invoiceId,
      tenantId,
      newPaid.toFixed(2),
      Math.max(0, newDue).toFixed(2),
      newStatus,
      extraFields,
    );
  }
}

export const invoiceService =
  new InvoiceService();
