import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  RemainingUsageResponse,
  SubscriptionActionResponse,
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

  async upgrade(userId: string): Promise<SubscriptionActionResponse> {
    const statusRes = await this.getStatus(userId);
    const current = statusRes.subscription;

    if (current.plan === SubscriptionPlan.PREMIUM && current.isActive) {
      throw new BadRequestException('User already has an active PREMIUM subscription');
    }

    const now = new Date();
    // Default 30-day premium billing cycle
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: SubscriptionPlan.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        startDate: now,
        endDate,
      },
    });

    // Update usage limit for PREMIUM immediately (1,000 requests)
    await this.prisma.usageRecord.upsert({
      where: { userId },
      create: {
        userId,
        requestCount: 0,
        totalLimit: this.getLimitForPlan(SubscriptionPlan.PREMIUM),
        resetAt: this.getNextMonthResetDate(),
      },
      update: {
        totalLimit: this.getLimitForPlan(SubscriptionPlan.PREMIUM),
      },
    });

    return {
      success: true,
      message: 'Subscription successfully upgraded to PREMIUM for 30 days',
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        isActive: true,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isLifetime: false,
      },
    };
  }

  async downgrade(userId: string): Promise<SubscriptionActionResponse> {
    const statusRes = await this.getStatus(userId);
    const current = statusRes.subscription;

    if (current.plan === SubscriptionPlan.FREE && current.isActive) {
      throw new BadRequestException('User is already on the FREE plan');
    }

    const now = new Date();

    const subscription = await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        startDate: now,
        endDate: null, // Lifetime free
      },
    });

    // Update usage limit to FREE (50 requests)
    await this.prisma.usageRecord.upsert({
      where: { userId },
      create: {
        userId,
        requestCount: 0,
        totalLimit: this.getLimitForPlan(SubscriptionPlan.FREE),
        resetAt: this.getNextMonthResetDate(),
      },
      update: {
        totalLimit: this.getLimitForPlan(SubscriptionPlan.FREE),
      },
    });

    return {
      success: true,
      message: 'Subscription successfully downgraded to FREE plan',
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        isActive: true,
        startDate: subscription.startDate,
        endDate: null,
        isLifetime: true,
      },
    };
  }
}
