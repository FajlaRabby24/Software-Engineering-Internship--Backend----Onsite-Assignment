import { Module } from '@nestjs/common';
import { WebSearchService } from './web-search.service.js';
import { WebSearchController } from './web-search.controller.js';

@Module({
  controllers: [WebSearchController],
  providers: [WebSearchService],
})
export class WebSearchModule {}
