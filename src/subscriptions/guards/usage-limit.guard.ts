import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SubscriptionsService } from '../subscriptions.service.js';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse<Response>();

    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'Authentication required to check usage limit',
      );
    }

    const usageResult =
      await this.subscriptionsService.checkAndIncrementUsage(userId);

    // Attach quota info headers to downstream response
    response.setHeader('X-RateLimit-Limit', usageResult.totalLimit);
    response.setHeader('X-RateLimit-Remaining', usageResult.remaining);
    response.setHeader('X-RateLimit-Reset', usageResult.resetAt.toISOString());

    if (!usageResult.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'You have reached your request limit for the current billing cycle. Please upgrade your subscription to continue.',
          totalLimit: usageResult.totalLimit,
          remaining: 0,
          resetAt: usageResult.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach remaining quota to request for convenient access in controllers
    request.usage = usageResult;

    return true;
  }
}
