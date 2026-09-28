import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service.js';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto.js';
import { UpdateAIProviderDto } from './dto/update-ai-provider.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/client/enums.js';
import type {
  AIProviderListResponse,
  AIProviderResponse,
} from './types/ai-provider.types.js';

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

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<AIProviderListResponse> {
    return this.aiProvidersService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAIProviderDto,
  ): Promise<AIProviderResponse> {
    return this.aiProvidersService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.remove(id);
  }

  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleActive(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.toggleActive(id);
  }
}
