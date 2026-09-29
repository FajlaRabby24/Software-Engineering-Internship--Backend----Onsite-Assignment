import { Module } from '@nestjs/common';
import { WebSearchService } from './web-search.service.js';
import { WebSearchController } from './web-search.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [AuthModule, SubscriptionsModule, ChatModule],
  controllers: [WebSearchController],
  providers: [WebSearchService],
  exports: [WebSearchService],
})
export class WebSearchModule {}
