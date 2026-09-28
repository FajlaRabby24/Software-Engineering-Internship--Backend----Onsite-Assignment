import { PartialType } from '@nestjs/mapped-types';
import { CreateAIProviderDto } from './create-ai-provider.dto.js';

export class UpdateAiProviderDto extends PartialType(CreateAIProviderDto) {}
