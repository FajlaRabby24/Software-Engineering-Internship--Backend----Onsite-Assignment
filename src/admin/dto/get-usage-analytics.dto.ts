import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsageAnalyticsDto {
  @ApiPropertyOptional({
    description: 'Number of past days to aggregate analytics for (between 1 and 90)',
    default: 7,
    minimum: 1,
    maximum: 90,
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}

