import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service.js';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/client/enums.js';
import type { AIProviderResponse } from './types/ai-provider.types.js';

@Controller('ai-providers')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateAIProviderDto,
  ): Promise<AIProviderResponse> {
    return this.aiProvidersService.create(createDto);
  }
}
