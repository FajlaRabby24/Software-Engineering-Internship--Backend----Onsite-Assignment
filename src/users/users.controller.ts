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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieves profile information, active subscription status, and usage record for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile fetched successfully',
    schema: {
      example: {
        success: true,
        user: {
          id: 'b5a6c117-76fe-4f12-9c32-23fbe2e9d291',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'USER',
          phoneNumber: '+1234567890',
          avatarUrl: null,
          createdAt: '2026-09-25T10:00:00.000Z',
          subscription: {
            plan: 'FREE',
            status: 'ACTIVE',
            endDate: null,
          },
          usage: {
            requestCount: 5,
            totalLimit: 50,
            resetAt: '2026-10-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing Bearer token',
  })
  async getProfile(
    @CurrentUser('sub') userId: string,
  ): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates editable profile fields (name, phone number, avatar URL).',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        success: true,
        user: {
          id: 'b5a6c117-76fe-4f12-9c32-23fbe2e9d291',
          name: 'Johnathan Doe',
          email: 'john.doe@example.com',
          phoneNumber: '+1987654321',
          avatarUrl: 'https://example.com/avatar.png',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error on input fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Verifies the old password and sets a new account password. Revokes previous sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        message: 'Password changed successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Incorrect current password or new password same as current',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user account',
    description: 'Permanently deletes user account, subscriptions, conversations, and usage records after password confirmation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Account deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Incorrect password confirmation',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteAccount(
    @CurrentUser('sub') userId: string,
    @Body() deleteAccountDto: DeleteAccountDto,
  ): Promise<DeleteAccountResponse> {
    return this.usersService.deleteAccount(userId, deleteAccountDto);
  }
}

