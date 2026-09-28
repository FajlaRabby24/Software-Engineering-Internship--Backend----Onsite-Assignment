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
  @IsString()
  @IsNotEmpty({ message: 'Provider name is required' })
  name: string;

  @IsEnum(AIProviderType, {
    message: 'Type must be OPENAI, CLAUDE, or GEMINI',
  })
  type: AIProviderType;

  @IsString()
  @IsNotEmpty({ message: 'API key is required' })
  apiKey: string;

  @IsOptional()
  @IsUrl({}, { message: 'Base URL must be a valid URL' })
  baseUrl?: string;

  @IsArray({ message: 'Models must be an array of model names' })
  @ArrayNotEmpty({ message: 'At least one model must be provided' })
  @IsString({ each: true, message: 'Each model must be a string' })
  models: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
