import { PartialType } from '@nestjs/swagger';
import { CreateAIProviderDto } from './create-ai-provider.dto.js';

export class UpdateAIProviderDto extends PartialType(CreateAIProviderDto) {}

