import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetUsersFilterDto } from './dto/get-users-filter.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type {
  AdminSubscriptionResponse,
  AdminUsersListResponse,
  DashboardStatsResponse,
  UserStatusResponse,
} from './types/admin.types.js';
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

  /**
   * Lists users with pagination, email/name search, subscription info, and usage counts.
   */
  async getUsers(filterDto: GetUsersFilterDto): Promise<AdminUsersListResponse> {
    const page = filterDto.page && filterDto.page > 0 ? filterDto.page : 1;
    const limit = filterDto.limit && filterDto.limit > 0 ? filterDto.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filterDto.search && filterDto.search.trim()) {
      const search = filterDto.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          phoneNumber: true,
          avatarUrl: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              endDate: true,
            },
          },
          _count: {
            select: {
              conversations: true,
              searchHistories: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      users,
    };
  }

  /**
   * Toggles active/inactive status of a user.
   * Prevents admin from accidentally deactivating their own account.
   */
  async toggleUserStatus(
    targetUserId: string,
    currentAdminId: string,
  ): Promise<UserStatusResponse> {
    if (targetUserId === currentAdminId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextState = !user.isActive;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: nextState },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return {
      success: true,
      message: `User ${nextState ? 'activated' : 'deactivated'} successfully`,
      user: updated,
    };
  }

  /**
   * Updates user role (USER <-> ADMIN).
   * Prevents admin from removing their own admin privileges.
   */
  async updateUserRole(
    targetUserId: string,
    currentAdminId: string,
    dto: UpdateUserRoleDto,
  ): Promise<UserStatusResponse> {
    if (targetUserId === currentAdminId && dto.role !== Role.ADMIN) {
      throw new BadRequestException('You cannot demote your own admin account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return {
      success: true,
      message: `User role successfully updated to ${dto.role}`,
      user: updated,
    };
  }

  /**
   * Admin manual override for user subscription and quotas.
   * Wraps Subscription update and UsageRecord update in a prisma.$transaction.
   */
  async updateSubscription(
    userId: string,
    dto: AdminUpdateSubscriptionDto,
  ): Promise<AdminSubscriptionResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    let endDate: Date | null = null;

    if (dto.plan === SubscriptionPlan.PREMIUM) {
      const days = dto.durationDays && dto.durationDays > 0 ? dto.durationDays : 30;
      endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const status = dto.status || SubscriptionStatus.ACTIVE;
    const totalLimit = dto.plan === SubscriptionPlan.PREMIUM ? 1000 : 50;

    const nextMonthReset = new Date();
    nextMonthReset.setMonth(nextMonthReset.getMonth() + 1);
    nextMonthReset.setDate(1);
    nextMonthReset.setHours(0, 0, 0, 0);

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: dto.plan,
          status,
          startDate: now,
          endDate,
        },
        update: {
          plan: dto.plan,
          status,
          startDate: now,
          endDate,
        },
      }),
      this.prisma.usageRecord.upsert({
        where: { userId },
        create: {
          userId,
          requestCount: 0,
          totalLimit,
          resetAt: nextMonthReset,
        },
        update: {
          totalLimit,
        },
      }),
    ]);

    const isExpired = subscription.endDate ? now > subscription.endDate : false;
    const isActive = subscription.status === SubscriptionStatus.ACTIVE && !isExpired;

    return {
      success: true,
      message: `User subscription successfully updated to ${dto.plan}`,
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        isActive,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    };
  }
}
