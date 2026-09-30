import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import type {
  RemainingUsageResponse,
  SubscriptionActionResponse,
  SubscriptionStatusResponse,
} from './types/subscription.types.js';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get subscription status',
    description: 'Retrieves current subscription plan, active status, and billing cycle expiry date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status fetched successfully',
    schema: {
      example: {
        success: true,
        subscription: {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          plan: 'PREMIUM',
          status: 'ACTIVE',
          isActive: true,
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2026-10-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getStatus(
    @CurrentUser('sub') userId: string,
  ): Promise<SubscriptionStatusResponse> {
    return this.subscriptionsService.getStatus(userId);
  }

  @Get('remaining')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get remaining request quota',
    description: 'Returns total monthly limit, requests used, requests remaining, and next reset date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Remaining usage fetched successfully',
    schema: {
      example: {
        success: true,
        usage: {
          requestCount: 15,
          totalLimit: 1000,
          remaining: 985,
          resetAt: '2026-10-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getRemaining(
    @CurrentUser('sub') userId: string,
  ): Promise<RemainingUsageResponse> {
    return this.subscriptionsService.getRemainingUsage(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upgrade subscription to PREMIUM',
    description: 'Upgrades user subscription to PREMIUM (1,000 monthly request quota for 30 days).',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription upgraded successfully',
    schema: {
      example: {
        success: true,
        message: 'Successfully upgraded to PREMIUM plan',
        subscription: {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          plan: 'PREMIUM',
          status: 'ACTIVE',
          isActive: true,
          startDate: '2026-09-30T00:00:00.000Z',
          endDate: '2026-10-30T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User already has an active PREMIUM subscription',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async upgrade(
    @CurrentUser('sub') userId: string,
  ): Promise<SubscriptionActionResponse> {
    return this.subscriptionsService.upgrade(userId);
  }

  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Downgrade subscription to FREE',
    description: 'Downgrades user subscription to FREE (50 monthly request quota).',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription downgraded successfully',
    schema: {
      example: {
        success: true,
        message: 'Successfully downgraded to FREE plan',
        subscription: {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          plan: 'FREE',
          status: 'ACTIVE',
          isActive: true,
          startDate: '2026-09-30T00:00:00.000Z',
          endDate: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User is already on the FREE plan',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async downgrade(
    @CurrentUser('sub') userId: string,
  ): Promise<SubscriptionActionResponse> {
    return this.subscriptionsService.downgrade(userId);
  }
}

