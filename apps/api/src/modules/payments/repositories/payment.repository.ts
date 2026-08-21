import {
  Types,
  type ClientSession,
} from "mongoose";

import {
  PaymentModel,
  type PaymentDocument,
} from "../models/payment.model.js";

import type {
  PaymentMethod,
  PaymentProviderType,
  PaymentStatus,
} from "../types/payment.types.js";

export interface CreatePaymentRepositoryInput {
  tenantId: string;
  branchId: string;
  orderId: string;
  customerId?: string;
  paymentNumber: string;
  method: PaymentMethod;
  provider?: PaymentProviderType;
  providerId?: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  parentPaymentId?: string;
  metadata?: Record<string, unknown>;
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

export class PaymentRepository {
  async create(
    input: CreatePaymentRepositoryInput,
    session?: ClientSession,
  ): Promise<PaymentDocument> {
    const payment = new PaymentModel({
      tenantId: toObjectId(
        input.tenantId,
        "tenantId",
      ),

      branchId: toObjectId(
        input.branchId,
        "branchId",
      ),

      orderId: toObjectId(
        input.orderId,
        "orderId",
      ),

      ...(input.customerId
        ? {
            customerId: toObjectId(
              input.customerId,
              "customerId",
            ),
          }
        : {}),

      paymentNumber: input.paymentNumber,

      method: input.method,

      ...(input.provider
  ? {
      provider: input.provider,
    }
  : {}),


      ...(input.providerId
        ? {
             providerId: toObjectId(
        input.providerId,
        "providerId",
      ),
          }
        : {}),

      amount: input.amount,

      currency: input.currency,

      idempotencyKey:
        input.idempotencyKey,

      ...(input.parentPaymentId
        ? {
            parentPaymentId: toObjectId(
              input.parentPaymentId,
              "parentPaymentId",
            ),
          }
        : {}),

      ...(input.metadata
        ? {
            metadata: input.metadata,
          }
        : {}),

      status: "INITIATED",
    });

    if (session) {
      await payment.save({ session });
    } else {
      await payment.save();
    }

    return payment;
  }

  async findById(
    paymentId: string,
    tenantId: string,
  ): Promise<PaymentDocument | null> {
    return PaymentModel.findOne({
      _id: toObjectId(paymentId, "paymentId"),
      tenantId: toObjectId(tenantId, "tenantId"),
    }).exec();
  }

  async findByIdAnyTenant(
  paymentId: string,
): Promise<PaymentDocument | null> {
  return PaymentModel.findOne({
    _id: toObjectId(
      paymentId,
      "paymentId",
    ),
  }).exec();
}

  async findByProviderTransactionIdAnyTenant(
  provider: PaymentProviderType,
  providerTransactionId: string,
): Promise<PaymentDocument | null> {
  return PaymentModel.findOne({
    provider,
    providerTransactionId,
  }).exec();
}

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<PaymentDocument | null> {
    return PaymentModel.findOne({
      tenantId: toObjectId(tenantId, "tenantId"),
      idempotencyKey,
    }).exec();
  }

  async findByProviderTransactionId(
    tenantId: string,
    providerTransactionId: string,
  ): Promise<PaymentDocument | null> {
    return PaymentModel.findOne({
      tenantId: toObjectId(tenantId, "tenantId"),
      providerTransactionId,
    }).exec();
  }

  async updateStatus(
    paymentId: string,
    tenantId: string,
    status: PaymentStatus,
    extraFields: Record<string, unknown> = {},
    session?: ClientSession,
  ): Promise<PaymentDocument | null> {
    const payment =
      await PaymentModel.findOne({
        _id: toObjectId(
          paymentId,
          "paymentId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      }).exec();

    if (!payment) {
      return null;
    }

    payment.status = status;

    Object.assign(
      payment,
      extraFields,
    );

    if (session) {
      await payment.save({ session });
    } else {
      await payment.save();
    }

    return payment;
  }

  async setProviderTransaction(
    paymentId: string,
    tenantId: string,
    providerTransactionId: string,
    session?: ClientSession,
  ): Promise<PaymentDocument | null> {
    const payment =
      await PaymentModel.findOne({
        _id: toObjectId(
          paymentId,
          "paymentId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      }).exec();

    if (!payment) {
      return null;
    }

    payment.providerTransactionId =
      providerTransactionId;

    if (session) {
      await payment.save({ session });
    } else {
      await payment.save();
    }

    return payment;
  }
  async findAll(
    tenantId: string,
    filters: {
      branchId?: string;
      status?: string;
      method?: string;
      provider?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ payments: PaymentDocument[]; total: number; page: number; limit: number }> {
    const query: Record<string, unknown> = {
      tenantId: toObjectId(tenantId, "tenantId"),
    };

    if (filters.branchId) {
      query.branchId = toObjectId(filters.branchId, "branchId");
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.method) {
      query.method = filters.method;
    }

    if (filters.provider) {
      query.provider = filters.provider;
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

    const [payments, total] = await Promise.all([
      PaymentModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      PaymentModel.countDocuments(query).exec(),
    ]);

    return { payments, total, page, limit };
  }
}

export const paymentRepository =
  new PaymentRepository();