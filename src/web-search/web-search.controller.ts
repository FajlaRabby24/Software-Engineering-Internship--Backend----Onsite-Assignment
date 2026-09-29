import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WebSearchService } from './web-search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { SearchSuggestionDto } from './dto/search-suggestion.dto.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { UsageLimitGuard } from '../subscriptions/guards/usage-limit.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import type {
  RecentSearchesResponse,
  SearchHistoryListResponse,
  SearchSuggestionsResponse,
  WebSearchResponse,
} from './types/web-search.types.js';

@Controller('web-search')
@UseGuards(AuthGuard)
export class WebSearchController {
  constructor(private readonly webSearchService: WebSearchService) {}

  @Post()
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  async search(
    @CurrentUser('sub') userId: string,
    @Body() dto: SearchQueryDto,
  ): Promise<WebSearchResponse> {
    return this.webSearchService.search(userId, dto);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ): Promise<SearchHistoryListResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.webSearchService.getHistory(userId, parsedLimit);
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  async getRecentSearches(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ): Promise<RecentSearchesResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.webSearchService.getRecentSearches(userId, parsedLimit);
  }

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(
    @Query() dto: SearchSuggestionDto,
  ): Promise<SearchSuggestionsResponse> {
    return this.webSearchService.getSuggestions(dto.q);
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.OK)
  async deleteHistory(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.webSearchService.deleteHistory(userId, id);
  }
}
