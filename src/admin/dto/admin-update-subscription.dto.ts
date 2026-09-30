import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../generated/client/enums.js';

export class AdminUpdateSubscriptionDto {
  @ApiProperty({
    description: 'Target plan for user',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PREMIUM,
  })
  @IsEnum(SubscriptionPlan, {
    message: 'Plan must be either FREE or PREMIUM',
  })
  @IsNotEmpty({ message: 'Plan cannot be empty' })
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Status of the subscription',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: 'Status must be ACTIVE, CANCELED, or EXPIRED',
  })
  status?: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @ApiPropertyOptional({
    description: 'Duration in days for PREMIUM plan (defaults to 30)',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;
}

