import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetUsersFilterDto } from './dto/get-users-filter.dto.js';
import { GetSubscriptionsFilterDto } from './dto/get-subscriptions-filter.dto.js';
import { GetUsageAnalyticsDto } from './dto/get-usage-analytics.dto.js';
import { GetRequestLogsFilterDto } from './dto/get-request-logs-filter.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto.js';
import type {
  AdminRequestLogsResponse,
  AdminSubscriptionItem,
  AdminSubscriptionResponse,
  AdminSubscriptionsListResponse,
  AdminUsersListResponse,
  DailyTrendItem,
  DashboardStatsResponse,
  ModelBreakdownItem,
  ProviderBreakdownItem,
  RequestActivityLogItem,
  UsageAnalyticsResponse,
  UserStatusResponse,
} from './types/admin.types.js';
import {
  MessageRole,
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

  /**
   * Lists subscriptions with pagination, filtering by plan/status, and user name/email search.
   */
  async getSubscriptions(
    filterDto: GetSubscriptionsFilterDto,
  ): Promise<AdminSubscriptionsListResponse> {
    const page = filterDto.page && filterDto.page > 0 ? filterDto.page : 1;
    const limit = filterDto.limit && filterDto.limit > 0 ? filterDto.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filterDto.plan) {
      where.plan = filterDto.plan;
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.search && filterDto.search.trim()) {
      const search = filterDto.search.trim();
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, subscriptions] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();
    const items: AdminSubscriptionItem[] = subscriptions.map((sub) => {
      const isExpired = sub.endDate ? now > sub.endDate : false;
      const isActive = sub.status === SubscriptionStatus.ACTIVE && !isExpired;

      return {
        id: sub.id,
        userId: sub.userId,
        plan: sub.plan,
        status: sub.status,
        isActive,
        startDate: sub.startDate,
        endDate: sub.endDate,
        createdAt: sub.createdAt,
        user: sub.user,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      subscriptions: items,
    };
  }

  /**
   * Analytics: Daily trends & provider/model breakdowns over a timeframe (default 7 days).
   * Uses pure Prisma queries:
   * 1. Fetches only lightweight `createdAt` timestamps for messages, conversations, and searches.
   * 2. Uses Prisma `groupBy` directly for provider & model distributions.
   */
  async getUsageAnalytics(
    queryDto: GetUsageAnalyticsDto,
  ): Promise<UsageAnalyticsResponse> {
    const days = queryDto.days && queryDto.days > 0 ? queryDto.days : 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Parallel pure Prisma queries
    const [
      messages,
      conversations,
      searches,
      providerGroups,
      modelGroups,
    ] = await Promise.all([
      // 1. Fetch only createdAt for messages (lean payload, no large content strings)
      this.prisma.message.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
        },
      }),

      // 2. Fetch only createdAt for conversations
      this.prisma.conversation.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
        },
      }),

      // 3. Fetch only createdAt for search histories
      this.prisma.searchHistory.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
        },
      }),

      // 4. Provider breakdown aggregated by Prisma groupBy
      this.prisma.message.groupBy({
        by: ['providerType'],
        where: {
          role: MessageRole.ASSISTANT,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
      }),

      // 5. Model breakdown aggregated by Prisma groupBy
      this.prisma.message.groupBy({
        by: ['providerType', 'modelName'],
        where: {
          role: MessageRole.ASSISTANT,
          modelName: { not: null },
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
      }),
    ]);

    // Build day map with 0-filled dates for continuous trend charts
    const dateMap = new Map<
      string,
      { messages: number; conversations: number; searches: number }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      dateMap.set(dateKey, { messages: 0, conversations: 0, searches: 0 });
    }

    for (const msg of messages) {
      const key = msg.createdAt.toISOString().slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) {
        entry.messages++;
      }
    }

    for (const conv of conversations) {
      const key = conv.createdAt.toISOString().slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) {
        entry.conversations++;
      }
    }

    for (const search of searches) {
      const key = search.createdAt.toISOString().slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) {
        entry.searches++;
      }
    }

    const dailyTrends: DailyTrendItem[] = Array.from(dateMap.entries()).map(
      ([date, counts]) => ({
        date,
        messages: counts.messages,
        conversations: counts.conversations,
        searches: counts.searches,
        totalRequests: counts.messages + counts.searches,
      }),
    );


    // Calculate provider percentage breakdown
    let totalAssistantCalls = 0;
    for (const p of providerGroups) {
      totalAssistantCalls += p._count.id;
    }

    const providerBreakdown: ProviderBreakdownItem[] = providerGroups
      .map((p) => {
        const count = p._count.id;
        const percentage =
          totalAssistantCalls > 0
            ? Number(((count / totalAssistantCalls) * 100).toFixed(1))
            : 0;

        return {
          provider: p.providerType || 'UNKNOWN',
          count,
          percentage,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Model breakdown sorted descending
    const modelBreakdown: ModelBreakdownItem[] = modelGroups
      .map((m) => ({
        model: m.modelName || 'Unknown Model',
        provider: m.providerType || 'UNKNOWN',
        count: m._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      timeframe: {
        days,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
      summary: {
        totalRequests: messages.length + searches.length,
        totalMessages: messages.length,
        totalConversations: conversations.length,
        totalSearches: searches.length,
      },
      dailyTrends,
      providerBreakdown,
      modelBreakdown,
    };
  }

  /**
   * Chronological request activity log from dedicated request_logs table.
   * Supports filtering by status code, HTTP method, endpoint, user ID, and text search.
   */
  async getRequestLogs(
    filterDto: GetRequestLogsFilterDto,
  ): Promise<AdminRequestLogsResponse> {
    const page = filterDto.page && filterDto.page > 0 ? filterDto.page : 1;
    const limit = filterDto.limit && filterDto.limit > 0 ? filterDto.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filterDto.method) {
      where.method = filterDto.method.toUpperCase();
    }

    if (filterDto.endpoint) {
      where.endpoint = {
        contains: filterDto.endpoint.trim(),
        mode: 'insensitive',
      };
    }

    if (filterDto.statusCode) {
      where.statusCode = filterDto.statusCode;
    }

    if (filterDto.userId) {
      where.userId = filterDto.userId;
    }

    if (filterDto.search && filterDto.search.trim()) {
      const search = filterDto.search.trim();
      where.OR = [
        { endpoint: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.requestLog.count({ where }),
      this.prisma.requestLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          method: true,
          endpoint: true,
          statusCode: true,
          durationMs: true,
          ip: true,
          userAgent: true,
          errorMessage: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
      logs,
    };
  }
}



