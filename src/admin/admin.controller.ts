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
import { AdminService } from './admin.service.js';
import { GetUsersFilterDto } from './dto/get-users-filter.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { Role } from '../generated/client/enums.js';
import type {
  AdminSubscriptionResponse,
  AdminUsersListResponse,
  DashboardStatsResponse,
  UserStatusResponse,
} from './types/admin.types.js';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService
  ) {}

  @Get('dashboard/stats')
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query() filterDto: GetUsersFilterDto,
  ): Promise<AdminUsersListResponse> {
    return this.adminService.getUsers(filterDto);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async toggleUserStatus(
    @Param('id') targetUserId: string,
    @CurrentUser('sub') currentAdminId: string,
  ): Promise<UserStatusResponse> {
    return this.adminService.toggleUserStatus(targetUserId, currentAdminId);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('id') targetUserId: string,
    @CurrentUser('sub') currentAdminId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserStatusResponse> {
    return this.adminService.updateUserRole(targetUserId, currentAdminId, dto);
  }

  @Patch('subscriptions/:userId')
  @HttpCode(HttpStatus.OK)
  async updateSubscription(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ): Promise<AdminSubscriptionResponse> {
    return this.adminService.updateSubscription(userId, dto);
  }
}
