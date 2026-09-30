import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Web search query to fetch results for and summarize',
    example: 'Latest features in TypeScript 5.5',
  })
  @IsString()
  @IsNotEmpty({ message: 'Search query cannot be empty' })
  query: string;

  @ApiPropertyOptional({
    description: 'Optional AI Provider UUID to use for synthesis. Uses default if omitted.',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Optional model name for summarizing results',
    example: 'gpt-4o-mini',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Model cannot be an empty string' })
  model?: string;
}

