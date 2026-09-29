import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../generated/client/enums.js';

export class AdminUpdateSubscriptionDto {
  @IsEnum(SubscriptionPlan, {
    message: 'Plan must be either FREE or PREMIUM',
  })
  @IsNotEmpty({ message: 'Plan cannot be empty' })
  plan: SubscriptionPlan;

  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: 'Status must be ACTIVE, CANCELED, or EXPIRED',
  })
  status?: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number; // Optional duration in days for PREMIUM (defaults to 30)
}
