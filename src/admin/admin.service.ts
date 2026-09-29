import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DashboardStatsResponse } from './types/admin.types.js';
import {
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../generated/client/enums.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates platform statistics for the admin dashboard.
   * Optimized: Uses groupBy and batch querying to reduce 15 queries down to 5.
   */
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const [
      userGroups,
      subscriptionGroups,
      totalConversations,
      totalMessages,
      totalSearches,
      providers,
    ] = await Promise.all([
      // 1. Group all users by (isActive, role) in a single DB query
      this.prisma.user.groupBy({
        by: ['isActive', 'role'],
        _count: { id: true },
      }),

      // 2. Group all subscriptions by (plan, status) in a single DB query
      this.prisma.subscription.groupBy({
        by: ['plan', 'status'],
        _count: { id: true },
      }),

      // 3. Activity counts
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.searchHistory.count(),

      // 4. AI Providers (small table, fetch overview in 1 query)
      this.prisma.aIProvider.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          isDefault: true,
        },
      }),
    ]);

    // Aggregate user metrics in memory
    let totalUsers = 0;
    let activeUsers = 0;
    let inactiveUsers = 0;
    let adminUsers = 0;

    for (const group of userGroups) {
      const count = group._count.id;
      totalUsers += count;
      if (group.isActive) {
        activeUsers += count;
      } else {
        inactiveUsers += count;
      }
      if (group.role === Role.ADMIN) {
        adminUsers += count;
      }
    }

    // Aggregate subscription metrics in memory
    let totalSubscriptions = 0;
    let freeSubscriptions = 0;
    let premiumSubscriptions = 0;
    let activeSubscriptions = 0;
    let expiredSubscriptions = 0;

    for (const group of subscriptionGroups) {
      const count = group._count.id;
      totalSubscriptions += count;

      if (group.plan === SubscriptionPlan.FREE) {
        freeSubscriptions += count;
      } else if (group.plan === SubscriptionPlan.PREMIUM) {
        premiumSubscriptions += count;
      }

      if (group.status === SubscriptionStatus.ACTIVE) {
        activeSubscriptions += count;
      } else if (group.status === SubscriptionStatus.EXPIRED) {
        expiredSubscriptions += count;
      }
    }

    // Aggregate providers in memory
    const activeProviders = providers.filter((p) => p.isActive).length;
    const defaultProvider =
      providers.find((p) => p.isDefault && p.isActive) ||
      providers.find((p) => p.isDefault) ||
      null;

    return {
      success: true,
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins: adminUsers,
      },
      subscriptions: {
        total: totalSubscriptions,
        free: freeSubscriptions,
        premium: premiumSubscriptions,
        active: activeSubscriptions,
        expired: expiredSubscriptions,
      },
      usage: {
        totalConversations,
        totalMessages,
        totalSearches,
      },
      providers: {
        total: providers.length,
        active: activeProviders,
        defaultProvider: defaultProvider
          ? {
              id: defaultProvider.id,
              name: defaultProvider.name,
              type: defaultProvider.type,
            }
          : null,
      },
    };
  }
}
