import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { AIProviderType } from '../../generated/client/enums.js';

export class CreateAIProviderDto {
  @ApiProperty({
    description: 'Display name for the AI provider',
    example: 'OpenAI Production',
  })
  @IsString()
  @IsNotEmpty({ message: 'Provider name is required' })
  name: string;

  @ApiProperty({
    description: 'Provider family type',
    enum: AIProviderType,
    example: AIProviderType.OPENAI,
  })
  @IsEnum(AIProviderType, {
    message: 'Type must be OPENAI, CLAUDE, or GEMINI',
  })
  type: AIProviderType;

  @ApiProperty({
    description: 'Secret API key for provider authentication (encrypted upon saving)',
    example: 'sk-proj-abc123456789...',
  })
  @IsString()
  @IsNotEmpty({ message: 'API key is required' })
  apiKey: string;

  @ApiPropertyOptional({
    description: 'Optional custom base API endpoint URL',
    example: 'https://api.openai.com/v1',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Base URL must be a valid URL' })
  baseUrl?: string;

  @ApiProperty({
    description: 'List of model IDs supported by this provider',
    example: ['gpt-4o', 'gpt-4o-mini'],
    type: [String],
  })
  @IsArray({ message: 'Models must be an array of model names' })
  @ArrayNotEmpty({ message: 'At least one model must be provided' })
  @IsString({ each: true, message: 'Each model must be a string' })
  models: string[];

  @ApiPropertyOptional({
    description: 'Designate this provider as the platform default',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

