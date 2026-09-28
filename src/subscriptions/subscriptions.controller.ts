import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import type {
  RemainingUsageResponse,
  SubscriptionActionResponse,
  SubscriptionStatusResponse,
} from './types/subscription.types.js';

@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(
    @CurrentUser('sub') userId: string,
  ): Promise<SubscriptionStatusResponse> {
    return this.subscriptionsService.getStatus(userId);
  }

  @Get('remaining')
  @HttpCode(HttpStatus.OK)
  async getRemaining(
    @CurrentUser('sub') userId: string,
  ): Promise<RemainingUsageResponse> {
    return this.subscriptionsService.getRemainingUsage(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  async upgrade(
    @CurrentUser('sub') userId: string,
  ): Promise<SubscriptionActionResponse> {
    return this.subscriptionsService.upgrade(userId);
  }
}
