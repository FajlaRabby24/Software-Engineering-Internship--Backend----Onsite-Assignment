import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendPromptDto {
  @IsString()
  @IsNotEmpty({ message: 'Prompt cannot be empty' })
  prompt: string;

  @IsOptional()
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  conversationId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  providerId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Model cannot be an empty string' })
  model?: string;
}
