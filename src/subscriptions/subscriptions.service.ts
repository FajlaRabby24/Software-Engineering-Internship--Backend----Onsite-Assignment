import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  RemainingUsageResponse,
  SubscriptionStatusResponse,
} from './types/subscription.types.js';
import { SubscriptionPlan, SubscriptionStatus } from '../generated/client/enums.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private getLimitForPlan(plan: SubscriptionPlan): number {
    return plan === SubscriptionPlan.PREMIUM ? 1000 : 50;
  }

  private getNextMonthResetDate(): Date {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    // Auto-create FREE subscription if user doesn't have one yet
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      });
    }

    // Check expiration for plans with an endDate
    const now = new Date();
    const isExpired = subscription.endDate ? now > subscription.endDate : false;
    const effectiveStatus = isExpired ? SubscriptionStatus.EXPIRED : subscription.status;
    const isActive = effectiveStatus === SubscriptionStatus.ACTIVE;

    // If newly expired, update status in DB
    if (isExpired && subscription.status !== SubscriptionStatus.EXPIRED) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    }

    return {
      success: true,
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: effectiveStatus,
        isActive,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isLifetime: !subscription.endDate,
      },
    };
  }

  async getRemainingUsage(userId: string): Promise<RemainingUsageResponse> {
    // 1. Get current subscription status
    const statusRes = await this.getStatus(userId);
    const plan = statusRes.subscription.isActive
      ? statusRes.subscription.plan
      : SubscriptionPlan.FREE;

    const totalLimit = this.getLimitForPlan(plan);
    const now = new Date();

    let record = await this.prisma.usageRecord.findUnique({
      where: { userId },
    });

    // 2. If no record exists, create one
    if (!record) {
      record = await this.prisma.usageRecord.create({
        data: {
          userId,
          requestCount: 0,
          totalLimit,
          resetAt: this.getNextMonthResetDate(),
        },
      });
    } else {
      // 3. Check if reset date has passed -> reset counter
      if (now >= record.resetAt) {
        record = await this.prisma.usageRecord.update({
          where: { userId },
          data: {
            requestCount: 0,
            totalLimit,
            resetAt: this.getNextMonthResetDate(),
          },
        });
      } else if (record.totalLimit !== totalLimit) {
        // Sync limit if plan changed
        record = await this.prisma.usageRecord.update({
          where: { userId },
          data: { totalLimit },
        });
      }
    }

    const remainingRequests = Math.max(0, record.totalLimit - record.requestCount);

    return {
      success: true,
      usage: {
        plan,
        totalLimit: record.totalLimit,
        usedRequests: record.requestCount,
        remainingRequests,
        resetAt: record.resetAt,
      },
    };
  }
}
