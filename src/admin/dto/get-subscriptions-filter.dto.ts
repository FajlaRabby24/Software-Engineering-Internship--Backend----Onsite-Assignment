import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../generated/client/enums.js';

export class GetSubscriptionsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SubscriptionPlan, { message: 'Plan must be either FREE or PREMIUM' })
  plan?: SubscriptionPlan;

  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: 'Status must be ACTIVE, CANCELED, or EXPIRED',
  })
  status?: SubscriptionStatus;

  @IsOptional()
  @IsString()
  search?: string; // Search on user email or name
}
