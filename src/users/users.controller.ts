import {
  Controller,
  Delete,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import type {
  ChangePasswordResponse,
  DeleteAccountResponse,
  UserProfileResponse,
} from './types/user.types.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @CurrentUser('sub') userId: string,
  ): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Delete('account')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser('sub') userId: string,
    @Body() deleteAccountDto: DeleteAccountDto,
  ): Promise<DeleteAccountResponse> {
    return this.usersService.deleteAccount(userId, deleteAccountDto);
  }
}
