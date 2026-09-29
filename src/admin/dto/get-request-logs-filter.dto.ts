import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRequestLogsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  method?: string; // GET, POST, PATCH, DELETE

  @IsOptional()
  @IsString()
  endpoint?: string; // e.g. /chat, /web-search

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusCode?: number; // 200, 400, 401, 500

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search on endpoint, error message, or user email/name
}
