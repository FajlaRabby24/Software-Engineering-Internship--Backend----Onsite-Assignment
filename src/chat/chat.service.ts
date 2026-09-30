import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { decrypt } from '../common/utils/crypto.util.js';
import { SendPromptDto } from './dto/send-prompt.dto.js';
import type {
  ChatResponse,
  ConversationDetailResponse,
  ConversationListResponse,
  StreamChunkEvent,
} from './types/chat.types.js';
import {
  AIProviderType,
  MessageRole,
  Role,
} from '../generated/client/enums.js';

interface ProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  apiKey: string;
  baseUrl: string | null;
  defaultModel: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the AI provider to use:
   * 1. If providerId provided in DTO, fetch that provider (verifying isActive: true).
   * 2. Otherwise, fetch the provider marked as isDefault: true (and isActive: true).
   * Decrypts API key in-memory.
   */
  async resolveProvider(providerId?: string): Promise<ProviderConfig> {
    let provider = null;

    if (providerId) {
      provider = await this.prisma.aIProvider.findUnique({
        where: { id: providerId },select: {isActive: true,apiKey: true, models: true, id: true, name: true, type: true, baseUrl: true}
      });
      if (!provider) {
        throw new NotFoundException('Specified AI provider was not found');
      }
      if (!provider.isActive) {
        throw new BadRequestException('Specified AI provider is currently disabled');
      }
    } else {
      provider = await this.prisma.aIProvider.findFirst({
        where: { isDefault: true, isActive: true },
      });
      if (!provider) {
        // Fallback: any active provider
        provider = await this.prisma.aIProvider.findFirst({
          where: { isActive: true },
        });
      }
      if (!provider) {
        throw new BadRequestException(
          'No active AI provider is configured. Please configure an AI provider first.',
        );
      }
    }

    let decryptedKey = '';
    try {
      decryptedKey = decrypt(provider.apiKey);
    } catch {
      decryptedKey = provider.apiKey;
    }

    const defaultModel =
      provider.models && provider.models.length > 0
        ? provider.models[0]
        : this.getFallbackModel(provider.type);

    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      apiKey: decryptedKey,
      baseUrl: provider.baseUrl,
      defaultModel,
    };
  }

  private getFallbackModel(type: AIProviderType): string {
    switch (type) {
      case AIProviderType.OPENAI:
        return 'gpt-4o-mini';
      case AIProviderType.CLAUDE:
        return 'claude-3-5-sonnet-20241022';
      case AIProviderType.GEMINI:
        return 'gemini-1.5-flash';
      default:
        return 'default-model';
    }
  }

  /**
   * Dispatches chat request to OpenAI, Claude, or Gemini
   */
  async callLlm(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    switch (provider.type) {
      case AIProviderType.OPENAI:
        return this.callOpenAI(provider, model, messages);
      case AIProviderType.CLAUDE:
        return this.callClaude(provider, model, messages);
      case AIProviderType.GEMINI:
        return this.callGemini(provider, model, messages);
      default:
        throw new BadRequestException(`Unsupported provider type: ${provider.type}`);
    }
  }

  private async callOpenAI(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const base = (provider.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const url = `${base}/chat/completions`;

    const formattedMessages = messages.map((m) => ({
      role: m.role.toLowerCase() === 'assistant' ? 'assistant' : m.role.toLowerCase() === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    const bodyPayload: any = {
      model,
      messages: formattedMessages,
    };


    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `OpenAI error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callClaude(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const base = (provider.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const url = `${base}/messages`;

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role.toUpperCase() === 'SYSTEM')?.content;
    const conversationMessages = messages
      .filter((m) => m.role.toUpperCase() !== 'SYSTEM')
      .map((m) => ({
        role: m.role.toLowerCase() === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const bodyPayload: any = {
      model,
      max_tokens: 4096,
      messages: conversationMessages,
    };
    if (systemMessage) {
      bodyPayload.system = systemMessage;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `Claude error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callGemini(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const base = (
      provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(provider.apiKey)}`;

    const contents = messages
      .filter((m) => m.role.toUpperCase() !== 'SYSTEM')
      .map((m) => ({
        role: m.role.toLowerCase() === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `Gemini error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Async generator that yields text chunks as they arrive from the provider
   */
  async *streamLlm(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): AsyncGenerator<string, void, unknown> {
    switch (provider.type) {
      case AIProviderType.OPENAI:
        yield* this.streamOpenAI(provider, model, messages);
        break;
      case AIProviderType.CLAUDE:
        yield* this.streamClaude(provider, model, messages);
        break;
      case AIProviderType.GEMINI:
        yield* this.streamGemini(provider, model, messages);
        break;
      default:
        throw new BadRequestException(`Unsupported provider type: ${provider.type}`);
    }
  }

  private async *streamOpenAI(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): AsyncGenerator<string, void, unknown> {
    const base = (provider.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const url = `${base}/chat/completions`;

    const formattedMessages = messages.map((m) => ({
      role: m.role.toLowerCase() === 'assistant' ? 'assistant' : m.role.toLowerCase() === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `OpenAI stream error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(dataStr);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // Ignore incomplete JSON chunks
        }
      }
    }
  }

  private async *streamClaude(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): AsyncGenerator<string, void, unknown> {
    const base = (provider.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const url = `${base}/messages`;

    const systemMessage = messages.find((m) => m.role.toUpperCase() === 'SYSTEM')?.content;
    const conversationMessages = messages
      .filter((m) => m.role.toUpperCase() !== 'SYSTEM')
      .map((m) => ({
        role: m.role.toLowerCase() === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const bodyPayload: any = {
      model,
      max_tokens: 4096,
      messages: conversationMessages,
      stream: true,
    };
    if (systemMessage) {
      bodyPayload.system = systemMessage;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `Claude stream error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          // Ignore incomplete JSON chunks
        }
      }
    }
  }

  private async *streamGemini(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
  ): AsyncGenerator<string, void, unknown> {
    const base = (
      provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    const url = `${base}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(provider.apiKey)}`;

    const contents = messages
      .filter((m) => m.role.toUpperCase() !== 'SYSTEM')
      .map((m) => ({
        role: m.role.toLowerCase() === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `Gemini stream error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();

        try {
          const parsed = JSON.parse(dataStr);
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) yield chunk;
        } catch {
          // Ignore non-json or incomplete SSE chunks
        }
      }
    }
  }

  /**
   * Main sendPrompt handler:
   * 1. Resolves/creates conversation
   * 2. Resolves provider & model
   * 3. Loads message history
   * 4. Saves User message
   * 5. Calls LLM
   * 6. Saves Assistant message
   * 7. Returns ChatResponse
   */
  async sendPrompt(
    userId: string,
    dto: SendPromptDto,
  ): Promise<ChatResponse> {
    let conversationId = dto.conversationId;

    if (conversationId) {
      const existing = await this.prisma.conversation.findUnique({
        where: { id: conversationId },select: {userId: true}
      });
      if (!existing || existing.userId !== userId) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      // Auto-title from first 40 chars of prompt
      const title =
        dto.prompt.trim().slice(0, 40) + (dto.prompt.length > 40 ? '...' : '');
      const newConv = await this.prisma.conversation.create({
        data: {
          userId,
          title,
        },
      });
      conversationId = newConv.id;
    }

    // Resolve provider & model
    const provider = await this.resolveProvider(dto.providerId);
    const selectedModel = dto.model || provider.defaultModel;

    // Load past history for context (last 20 messages)
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const llmMessages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: Role.USER, content: dto.prompt },
    ];

    // Save user message in DB
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content: dto.prompt,
      },
    });

    // Call LLM
    const aiAnswer = await this.callLlm(provider, selectedModel, llmMessages);

    // Save assistant message and update conversation timestamp atomically
    const [assistantMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: aiAnswer,
          providerType: provider.type,
          modelName: selectedModel,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      conversationId,
      userMessage: {
        id: userMessage.id,
        conversationId: userMessage.conversationId,
        role: userMessage.role,
        content: userMessage.content,
        providerType: userMessage.providerType,
        modelName: userMessage.modelName,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        conversationId: assistantMessage.conversationId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        providerType: assistantMessage.providerType,
        modelName: assistantMessage.modelName,
        createdAt: assistantMessage.createdAt,
      },
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        model: selectedModel,
      },
    };
  }

  /**
   * Streaming prompt handler:
   * 1. Resolves/creates conversation
   * 2. Saves User message
   * 3. Streams tokens from LLM and yields StreamChunkEvent
   * 4. Accumulates response and persists Assistant message atomically upon completion
   */
  async *sendPromptStream(
    userId: string,
    dto: SendPromptDto,
  ): AsyncGenerator<StreamChunkEvent, void, unknown> {
    let conversationId = dto.conversationId;

    if (conversationId) {
      const existing = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { userId: true },
      });
      if (!existing || existing.userId !== userId) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      const title =
        dto.prompt.trim().slice(0, 40) + (dto.prompt.length > 40 ? '...' : '');
      const newConv = await this.prisma.conversation.create({
        data: {
          userId,
          title,
        },
      });
      conversationId = newConv.id;
    }

    // Resolve provider & model
    const provider = await this.resolveProvider(dto.providerId);
    const selectedModel = dto.model || provider.defaultModel;

    // Load history for context
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const llmMessages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: Role.USER, content: dto.prompt },
    ];

    // Save user message in DB
    await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content: dto.prompt,
      },
    });

    let accumulatedText = '';

    try {
      for await (const chunk of this.streamLlm(provider, selectedModel, llmMessages)) {
        accumulatedText += chunk;
        yield {
          conversationId,
          chunk,
          done: false,
        };
      }
    } finally {
      // Save assistant message and update conversation updatedAt atomically
      if (accumulatedText.length > 0) {
        await this.prisma.$transaction([
          this.prisma.message.create({
            data: {
              conversationId,
              role: MessageRole.ASSISTANT,
              content: accumulatedText,
              providerType: provider.type,
              modelName: selectedModel,
            },
          }),
          this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          }),
        ]);
      }

      yield {
        conversationId,
        chunk: '',
        done: true,
      };
    }
  }

  /**
   * List conversations for the authenticated user
   */
  async getConversations(userId: string): Promise<ConversationListResponse> {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      success: true,
      count: conversations.length,
      conversations: conversations.map((c) => ({
        id: c.id,
        userId: c.userId,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastMessage: c.messages[0] || null,
      })),
    };
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(
    userId: string,
    conversationId: string,
  ): Promise<ConversationDetailResponse> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      success: true,
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages,
      },
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  }
}
