import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Search query cannot be empty' })
  query: string;

  @IsOptional()
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  providerId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Model cannot be an empty string' })
  model?: string;
}
