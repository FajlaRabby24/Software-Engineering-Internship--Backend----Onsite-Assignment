import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { decrypt, encrypt, maskApiKey } from '../common/utils/crypto.util.js';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto.js';
import type {
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
