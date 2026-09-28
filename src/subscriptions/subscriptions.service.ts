import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SubscriptionStatusResponse } from './types/subscription.types.js';
import { SubscriptionPlan, SubscriptionStatus } from '../generated/client/enums.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
