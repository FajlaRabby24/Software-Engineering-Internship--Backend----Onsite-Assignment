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

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  async sendPrompt(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendPromptDto,
  ): Promise<ChatResponse> {
    return this.chatService.sendPrompt(userId, dto);
  }

  @Post('stream')
  @UseGuards(UsageLimitGuard)
  @Sse()
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
  async getConversations(
    @CurrentUser('sub') userId: string,
  ): Promise<ConversationListResponse> {
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  async getConversationMessages(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<ConversationDetailResponse> {
    return this.chatService.getConversationMessages(userId, conversationId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.chatService.deleteConversation(userId, conversationId);
  }
}
