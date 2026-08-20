import {
  Types,
  type ClientSession,
} from "mongoose";

import {
  RefundModel,
  type RefundDocument,
} from "../models/refund.model.js";

import type {
  RefundStatus,
  RefundType,
} from "../types/payment.types.js";

export interface CreateRefundRepositoryInput {
  tenantId: string;
  branchId: string;
  paymentId: string;
  orderId: string;
  refundNumber: string;
  type: RefundType;
  amount: string;
  currency: string;
  reason?: string;
  providerRefundId?: string;
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

export class RefundRepository {
  async create(
    input: CreateRefundRepositoryInput,
    session?: ClientSession,
  ): Promise<RefundDocument> {
    const refund = new RefundModel({
      tenantId: toObjectId(
        input.tenantId,
        "tenantId",
      ),

      branchId: toObjectId(
        input.branchId,
        "branchId",
      ),

      paymentId: toObjectId(
        input.paymentId,
        "paymentId",
      ),

      orderId: toObjectId(
        input.orderId,
        "orderId",
      ),

      refundNumber:
        input.refundNumber,

      type: input.type,

      amount: input.amount,

      currency: input.currency,

      ...(input.reason
        ? {
            reason: input.reason,
          }
        : {}),

      ...(input.providerRefundId
        ? {
            providerRefundId:
              input.providerRefundId,
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
      await refund.save({ session });
    } else {
      await refund.save();
    }

    return refund;
  }

  async findById(
    refundId: string,
    tenantId: string,
  ): Promise<RefundDocument | null> {
    return RefundModel.findOne({
      _id: toObjectId(
        refundId,
        "refundId",
      ),
      tenantId: toObjectId(
        tenantId,
        "tenantId",
      ),
    }).exec();
  }

  async findByProviderRefundId(
  tenantId: string,
  providerRefundId: string,
): Promise<RefundDocument | null> {
  return RefundModel.findOne({
    tenantId: toObjectId(
      tenantId,
      "tenantId",
    ),
    providerRefundId,
  }).exec();
}

  async findByPaymentId(
    tenantId: string,
    paymentId: string,
  ): Promise<RefundDocument[]> {
    return RefundModel.find({
      tenantId: toObjectId(
        tenantId,
        "tenantId",
      ),
      paymentId: toObjectId(
        paymentId,
        "paymentId",
      ),
    })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  async updateStatus(
    refundId: string,
    tenantId: string,
    status: RefundStatus,
    extraFields: Record<
      string,
      unknown
    > = {},
    session?: ClientSession,
  ): Promise<RefundDocument | null> {
    const refund =
      await RefundModel.findOne({
        _id: toObjectId(
          refundId,
          "refundId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      }).exec();

    if (!refund) {
      return null;
    }

    refund.status = status;

    Object.assign(
      refund,
      extraFields,
    );

    if (session) {
      await refund.save({ session });
    } else {
      await refund.save();
    }

    return refund;
  }

  async setProviderRefundId(
    refundId: string,
    tenantId: string,
    providerRefundId: string,
    session?: ClientSession,
  ): Promise<RefundDocument | null> {
    const refund =
      await RefundModel.findOne({
        _id: toObjectId(
          refundId,
          "refundId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      }).exec();

    if (!refund) {
      return null;
    }

    refund.providerRefundId =
      providerRefundId;

    if (session) {
      await refund.save({ session });
    } else {
      await refund.save();
    }

    return refund;
  }

    async updateProviderResult(
    refundId: string,
    tenantId: string,
    providerRefundId: string,
    status: RefundStatus,
    extraFields: Record<string, unknown> = {},
    session?: ClientSession,
  ): Promise<RefundDocument | null> {
    const refund =
      await RefundModel.findOne({
        _id: toObjectId(
          refundId,
          "refundId",
        ),
        tenantId: toObjectId(
          tenantId,
          "tenantId",
        ),
      }).exec();

    if (!refund) {
      return null;
    }

    refund.providerRefundId =
      providerRefundId;

    refund.status = status;

    Object.assign(
      refund,
      extraFields,
    );

    if (session) {
      await refund.save({ session });
    } else {
      await refund.save();
    }

    return refund;
  }

  async getTotalRefundedAmount(
    tenantId: string,
    paymentId: string,
  ): Promise<string> {
    const refunds =
      await this.findByPaymentId(
        tenantId,
        paymentId,
      );

    let total = 0;

    for (const refund of refunds) {
      if (
        refund.status ===
          "COMPLETED" ||
        refund.status ===
          "PENDING"
      ) {
        total += Number(
          refund.amount.toString(),
        );
      }
    }

    return total.toFixed(2);
  }
}

export const refundRepository =
  new RefundRepository();