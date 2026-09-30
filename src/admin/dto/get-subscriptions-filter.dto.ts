import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../generated/client/enums.js';

export class GetSubscriptionsFilterDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of subscriptions per page',
    default: 10,
    minimum: 1,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by subscription plan',
    enum: SubscriptionPlan,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan, { message: 'Plan must be either FREE or PREMIUM' })
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Filter by subscription status',
    enum: SubscriptionStatus,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: 'Status must be ACTIVE, CANCELED, or EXPIRED',
  })
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Search string on user name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

