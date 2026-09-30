import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { GetUsersFilterDto } from './dto/get-users-filter.dto.js';
import { GetSubscriptionsFilterDto } from './dto/get-subscriptions-filter.dto.js';
import { GetUsageAnalyticsDto } from './dto/get-usage-analytics.dto.js';
import { GetRequestLogsFilterDto } from './dto/get-request-logs-filter.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { Role } from '../generated/client/enums.js';
import type {
  AdminRequestLogsResponse,
  AdminSubscriptionResponse,
  AdminSubscriptionsListResponse,
  AdminUsersListResponse,
  DashboardStatsResponse,
  SystemHealthResponse,
  UsageAnalyticsResponse,
  UserStatusResponse,
} from './types/admin.types.js';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Platform Dashboard Statistics',
    description: 'Returns aggregated platform statistics: active/inactive users, subscriptions breakdown, total chat conversations/messages, web searches, and AI providers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List users with pagination & search',
    description: 'Retrieves paginated user accounts with their active subscriptions and usage counters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
  })
  async getUsers(
    @Query() filterDto: GetUsersFilterDto,
  ): Promise<AdminUsersListResponse> {
    return this.adminService.getUsers(filterDto);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate / Deactivate user',
    description: 'Toggles active state of a user. Self-protection prevents an admin from deactivating their own account.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - cannot deactivate your own account',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async toggleUserStatus(
    @Param('id') targetUserId: string,
    @CurrentUser('sub') currentAdminId: string,
  ): Promise<UserStatusResponse> {
    return this.adminService.toggleUserStatus(targetUserId, currentAdminId);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user role',
    description: 'Changes a user role between USER and ADMIN. Prevents self-demotion.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - cannot demote your own account',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserRole(
    @Param('id') targetUserId: string,
    @CurrentUser('sub') currentAdminId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserStatusResponse> {
    return this.adminService.updateUserRole(targetUserId, currentAdminId, dto);
  }

  @Patch('subscriptions/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin plan update override',
    description: 'Manually overrides user subscription plan, duration, and adjusts usage limits atomically.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Target User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription overridden successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateSubscription(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ): Promise<AdminSubscriptionResponse> {
    return this.adminService.updateSubscription(userId, dto);
  }

  @Get('subscriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List subscriptions with filters & search',
    description: 'Lists all user subscriptions with filtering by plan (FREE/PREMIUM), status (ACTIVE/CANCELED/EXPIRED), and user name/email search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions list retrieved successfully',
  })
  async getSubscriptions(
    @Query() filterDto: GetSubscriptionsFilterDto,
  ): Promise<AdminSubscriptionsListResponse> {
    return this.adminService.getSubscriptions(filterDto);
  }

  @Get('analytics/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Usage Analytics & Trends',
    description: 'Daily trend line metrics and provider/model distributions over a configurable timeframe (default 7 days).',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage analytics retrieved successfully',
  })
  async getUsageAnalytics(
    @Query() queryDto: GetUsageAnalyticsDto,
  ): Promise<UsageAnalyticsResponse> {
    return this.adminService.getUsageAnalytics(queryDto);
  }

  @Get('logs/requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chronological HTTP request activity log',
    description: 'Live audit log of all incoming API requests recorded by the global request interceptor, with status code, response time in ms, endpoint, and user filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Request activity logs retrieved',
  })
  async getRequestLogs(
    @Query() filterDto: GetRequestLogsFilterDto,
  ): Promise<AdminRequestLogsResponse> {
    return this.adminService.getRequestLogs(filterDto);
  }

  @Get('system/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'System Health Check',
    description: 'Detailed diagnostic health status covering process memory, uptime, database latency probe, and live upstream AI provider connectivity.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health report generated',
    schema: {
      example: {
        success: true,
        status: 'HEALTHY',
        timestamp: '2026-09-30T12:00:00.000Z',
        uptime: {
          seconds: 3600,
          formatted: '0d 1h 0m 0s',
        },
        process: {
          nodeVersion: 'v20.18.0',
          pid: 12345,
          platform: 'linux',
        },
        memory: {
          heapUsedMB: 48.25,
          heapTotalMB: 65.5,
          rssMB: 110.2,
          externalMB: 4.1,
        },
        database: {
          status: 'UP',
          latencyMs: 12,
          message: 'Database connection is healthy',
        },
        providers: {
          total: 3,
          healthy: 3,
          unhealthy: 0,
          items: [
            {
              id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              name: 'OpenAI Production',
              type: 'OPENAI',
              isActive: true,
              isDefault: true,
              status: 'healthy',
              latencyMs: 145,
              message: 'Provider is healthy and reachable',
            },
          ],
        },
      },
    },
  })
  async getSystemHealth(): Promise<SystemHealthResponse> {
    return this.adminService.getSystemHealth();
  }
}





