import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { decrypt, encrypt, maskApiKey } from '../common/utils/crypto.util.js';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto.js';
import { UpdateAIProviderDto } from './dto/update-ai-provider.dto.js';
import type {
  AIProviderHealthResponse,
  AIProviderListResponse,
  AIProviderResponse,
  AIProviderResponseData,
} from './types/ai-provider.types.js';

@Injectable()
export class AiProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createAIProviderDto: CreateAIProviderDto,
  ): Promise<AIProviderResponse> {
    // Encrypt the API key securely with AES-256-GCM
    const encryptedApiKey = encrypt(createAIProviderDto.apiKey);

    // If marked as default, unset any existing default provider
    if (createAIProviderDto.isDefault) {
      await this.prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the very first provider, make it default automatically
    let isDefault = createAIProviderDto.isDefault ?? false;
    if (!isDefault) {
      const count = await this.prisma.aIProvider.count();
      if (count === 0) {
        isDefault = true;
      }
    }

    const provider = await this.prisma.aIProvider.create({
      data: {
        name: createAIProviderDto.name,
        type: createAIProviderDto.type,
        apiKey: encryptedApiKey,
        baseUrl: createAIProviderDto.baseUrl,
        models: createAIProviderDto.models,
        isDefault,
      },
    });

    return {
      success: true,
      message: 'AI provider added successfully',
      provider: this.formatProviderResponse(
        provider,
        createAIProviderDto.apiKey,
      ),
    };
  }

  async findAll(): Promise<AIProviderListResponse> {
    const providers = await this.prisma.aIProvider.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      count: providers.length,
      providers: providers.map((provider) =>
        this.formatProviderResponse(provider),
      ),
    };
  }

  async findOne(id: string): Promise<AIProviderResponse> {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('AI Provider not found');
    }

    return {
      success: true,
      provider: this.formatProviderResponse(provider),
    };
  }

  async update(
    id: string,
    updateAIProviderDto: UpdateAIProviderDto,
  ): Promise<AIProviderResponse> {
    const existing = await this.prisma.aIProvider.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    if (updateAIProviderDto.isDefault) {
      await this.prisma.aIProvider.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const data= {...updateAIProviderDto};

    if (updateAIProviderDto.apiKey) {
      data.apiKey = encrypt(updateAIProviderDto.apiKey);
    }

    const updated = await this.prisma.aIProvider.update({
      where: { id },
      data,
    });

    return {
      success: true,
      message: 'AI provider updated successfully',
      provider: this.formatProviderResponse(
        updated,
        updateAIProviderDto.apiKey,
      ),
    };
  }

  async remove(id: string): Promise<AIProviderResponse> {
    const existing = await this.prisma.aIProvider.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    const updated = await this.prisma.aIProvider.update({
      where: { id },
      data: {
        isActive: false,
        isDefault: false,
      },
    });

    return {
      success: true,
      message: 'AI provider soft deleted successfully',
      provider: this.formatProviderResponse(updated),
    };
  }

  async toggleActive(id: string): Promise<AIProviderResponse> {
    const existing = await this.prisma.aIProvider.findUnique({
      where: { id },select: {
        id: true,
        isActive: true
      },
    });

    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    const nextState = !existing.isActive;

    const updated = await this.prisma.aIProvider.update({
      where: { id },
      data: {
        isActive: nextState,
      },
    });

    return {
      success: true,
      message: `AI provider ${nextState ? 'enabled' : 'disabled'} successfully`,
      provider: this.formatProviderResponse(updated),
    };
  }

  async setDefault(id: string): Promise<AIProviderResponse> {
    const existing = await this.prisma.aIProvider.findUnique({
      where: { id }, select: {
        id: true,
        isActive: true
      }
    });

    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    if (!existing.isActive) {
      throw new BadRequestException('Cannot set an inactive AI provider as default');
    }

    await this.prisma.aIProvider.updateMany({
      where: { isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });

    const updated = await this.prisma.aIProvider.update({
      where: { id },
      data: { isDefault: true },
    });

    return {
      success: true,
      message: 'AI provider set as default successfully',
      provider: this.formatProviderResponse(updated),
    };
  }

  async checkHealth(id: string): Promise<AIProviderHealthResponse> {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('AI Provider not found');
    }

    let apiKey = '';
    try {
      apiKey = decrypt(provider.apiKey);
    } catch {
      apiKey = provider.apiKey;
    }

    const start = Date.now();

    try {
      let endpoint = '';
      let options: RequestInit = {
        signal: AbortSignal.timeout(10000), // 10s timeout
      };

      if (provider.type === 'OPENAI') {
        const base = (provider.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
        endpoint = `${base}/models`;
        options = {
          ...options,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        };
      } else if (provider.type === 'CLAUDE') {
        const base = (provider.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
        endpoint = `${base}/models`;
        options = {
          ...options,
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        };
      } else if (provider.type === 'GEMINI') {
        const base = (provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
        endpoint = `${base}/models?key=${encodeURIComponent(apiKey)}`;
        options = {
          ...options,
          method: 'GET',
        };
      } else {
        const base = provider.baseUrl || '';
        endpoint = base;
        options = {
          ...options,
          method: 'GET',
        };
      }

      const response = await fetch(endpoint, options);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          id: provider.id,
          name: provider.name,
          type: provider.type,
          status: 'unhealthy',
          latencyMs,
          message: `Provider health check failed with HTTP ${response.status}`,
          details: {
            statusCode: response.status,
            error: errorText.slice(0, 500),
          },
        };
      }

      return {
        success: true,
        id: provider.id,
        name: provider.name,
        type: provider.type,
        status: 'healthy',
        latencyMs,
        message: 'Provider is healthy and reachable',
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        id: provider.id,
        name: provider.name,
        type: provider.type,
        status: 'unhealthy',
        latencyMs,
        message: err?.message || 'Failed to connect to provider endpoint',
        details: {
          error: String(err),
        },
      };
    }
  }

  private formatProviderResponse(
    provider: any,
    rawApiKey?: string,
  ): AIProviderResponseData {
    let masked = '••••••••••••';
    try {
      const key = rawApiKey || decrypt(provider.apiKey);
      masked = maskApiKey(key);
    } catch {
      masked = maskApiKey(provider.apiKey);
    }

    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      apiKey: masked,
      baseUrl: provider.baseUrl,
      models: provider.models,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
