import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendPromptDto {
  @ApiProperty({
    description: 'The user prompt message to send to the AI',
    example: 'Explain how async generators work in TypeScript.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Prompt cannot be empty' })
  prompt: string;

  @ApiPropertyOptional({
    description: 'UUID of an existing conversation. If omitted, a new conversation is created automatically.',
    example: 'd9b2d63d-a233-4123-8472-881b7e459021',
  })
  @IsOptional()
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'UUID of a configured AI Provider. If omitted, the default active provider is used.',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Specific model identifier (e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-flash). If omitted, the provider default model is used.',
    example: 'gpt-4o-mini',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Model cannot be an empty string' })
  model?: string;
}

