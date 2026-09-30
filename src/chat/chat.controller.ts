import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service.js';
import { SendPromptDto } from './dto/send-prompt.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { UsageLimitGuard } from '../subscriptions/guards/usage-limit.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import type {
  ChatResponse,
  ConversationDetailResponse,
  ConversationListResponse,
} from './types/chat.types.js';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send prompt to AI (Standard Response)',
    description: 'Sends a prompt within a conversation or creates a new conversation. Consumes 1 request quota and returns the full AI response.',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt processed and answer generated',
    schema: {
      example: {
        success: true,
        conversationId: 'd9b2d63d-a233-4123-8472-881b7e459021',
        userMessage: {
          id: 'b5a6c117-76fe-4f12-9c32-23fbe2e9d291',
          content: 'Explain async generators in TypeScript',
          role: 'USER',
        },
        assistantMessage: {
          id: 'c7d8e9f0-1234-5678-9abc-def012345678',
          content: 'Async generators in TypeScript combine async/await with generators...',
          role: 'ASSISTANT',
          providerType: 'OPENAI',
          modelName: 'gpt-4o-mini',
        },
        provider: {
          name: 'OpenAI Production',
          type: 'OPENAI',
          model: 'gpt-4o-mini',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Monthly request usage quota limit reached',
  })
  async sendPrompt(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendPromptDto,
  ): Promise<ChatResponse> {
    return this.chatService.sendPrompt(userId, dto);
  }

  @Post('stream')
  @UseGuards(UsageLimitGuard)
  @Sse()
  @ApiOperation({
    summary: 'Send prompt with Server-Sent Events (SSE Stream)',
    description: 'Streams tokens in real-time as chunks arrive from the AI provider. Automatically saves the full answer upon completion.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream initiated; chunks emitted as { conversationId, chunk, done } events',
  })
  @ApiResponse({
    status: 403,
    description: 'Monthly request usage quota limit reached',
  })
  streamPrompt(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendPromptDto,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          for await (const chunkEvent of this.chatService.sendPromptStream(userId, dto)) {
            subscriber.next({
              data: chunkEvent,
            });
            if (chunkEvent.done) {
              subscriber.complete();
              break;
            }
          }
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List user conversations',
    description: 'Retrieves all conversations belonging to the authenticated user, ordered by most recently updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations list retrieved',
  })
  async getConversations(
    @CurrentUser('sub') userId: string,
  ): Promise<ConversationListResponse> {
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get conversation message history',
    description: 'Retrieves full chronological message history for a given conversation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation messages retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  async getConversationMessages(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<ConversationDetailResponse> {
    return this.chatService.getConversationMessages(userId, conversationId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Deletes a conversation and all cascading message records.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  async deleteConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.chatService.deleteConversation(userId, conversationId);
  }
}

