import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import type { SubscriptionStatusResponse } from './types/subscription.types.js';

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
}
