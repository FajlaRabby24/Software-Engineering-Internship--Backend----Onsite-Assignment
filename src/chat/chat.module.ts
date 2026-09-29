import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
