import {
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
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { Role } from '../generated/client/enums.js';
import type {
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
}
