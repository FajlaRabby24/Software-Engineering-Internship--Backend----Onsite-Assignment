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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service.js';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto.js';
import { UpdateAIProviderDto } from './dto/update-ai-provider.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/client/enums.js';
import type {
  AIProviderHealthResponse,
  AIProviderListResponse,
  AIProviderResponse,
} from './types/ai-provider.types.js';

@ApiTags('AI Providers (Admin)')
@ApiBearerAuth('JWT-auth')
@Controller('ai-providers')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Configure a new AI Provider',
    description: 'Registers and securely encrypts API credentials for OpenAI, Claude, or Gemini.',
  })
  @ApiResponse({
    status: 201,
    description: 'Provider created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  async create(
    @Body() createDto: CreateAIProviderDto,
  ): Promise<AIProviderResponse> {
    return this.aiProvidersService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all AI Providers',
    description: 'Returns all configured AI providers with masked API keys.',
  })
  @ApiResponse({
    status: 200,
    description: 'Providers retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  async findAll(): Promise<AIProviderListResponse> {
    return this.aiProvidersService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get AI Provider details by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider found',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async findOne(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update AI Provider',
    description: 'Updates provider fields (name, models, baseUrl, or API key).',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAIProviderDto,
  ): Promise<AIProviderResponse> {
    return this.aiProvidersService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete AI Provider',
    description: 'Deactivates or soft-removes the AI provider.',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider removed',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async remove(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.remove(id);
  }

  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle active/inactive state',
    description: 'Enables or disables an AI provider from being selected in chat prompts.',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider state toggled',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async toggleActive(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.toggleActive(id);
  }

  @Patch(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set default provider',
    description: 'Sets this provider as the platform-wide primary AI provider.',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Default provider updated',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async setDefault(@Param('id') id: string): Promise<AIProviderResponse> {
    return this.aiProvidersService.setDefault(id);
  }

  @Get(':id/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test provider health & connectivity',
    description: 'Pings the provider upstream API models endpoint using decrypted API key and returns latency in ms.',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed',
    schema: {
      example: {
        success: true,
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: 'OpenAI Production',
        type: 'OPENAI',
        status: 'healthy',
        latencyMs: 142,
        message: 'Provider is healthy and reachable',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async checkHealth(
    @Param('id') id: string,
  ): Promise<AIProviderHealthResponse> {
    return this.aiProvidersService.checkHealth(id);
  }
}

