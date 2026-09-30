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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Web Search')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('web-search')
export class WebSearchController {
  constructor(private readonly webSearchService: WebSearchService) {}

  @Post()
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Perform AI Web Search',
    description: 'Scrapes live web search results via DuckDuckGo, caches results for 2 hours, synthesizes findings using the selected AI provider, and consumes 1 quota request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search performed and synthesized summary generated',
    schema: {
      example: {
        success: true,
        query: 'Latest features in TypeScript 5.5',
        summary: 'TypeScript 5.5 introduces inferred type predicates, regex syntax validation...',
        sources: [
          {
            title: 'TypeScript 5.5 Release Notes',
            url: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/',
            snippet: 'TypeScript 5.5 is here! Inferred type predicates...',
          },
        ],
        cached: false,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Monthly request usage quota limit reached',
  })
  async search(
    @CurrentUser('sub') userId: string,
    @Body() dto: SearchQueryDto,
  ): Promise<WebSearchResponse> {
    return this.webSearchService.search(userId, dto);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get search history',
    description: 'Retrieves past searches and summarized answers performed by the user.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of history records to return (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search history list retrieved',
  })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ): Promise<SearchHistoryListResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.webSearchService.getHistory(userId, parsedLimit);
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recent distinct queries',
    description: 'Returns the most recent unique queries searched by the user.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of recent queries (default: 5)',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent searches retrieved',
  })
  async getRecentSearches(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ): Promise<RecentSearchesResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.webSearchService.getRecentSearches(userId, parsedLimit);
  }

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get search suggestions / autocompletions',
    description: 'Returns autocompletion suggestions matching the prefix query string.',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions list retrieved',
    schema: {
      example: {
        success: true,
        query: 'type',
        suggestions: [
          'typescript tutorial',
          'typescript 5.5 features',
          'typescript vs javascript',
        ],
      },
    },
  })
  async getSuggestions(
    @Query() dto: SearchSuggestionDto,
  ): Promise<SearchSuggestionsResponse> {
    return this.webSearchService.getSuggestions(dto.q);
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete search history entry',
  })
  @ApiParam({
    name: 'id',
    description: 'Search history record UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Search history deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Search history not found',
  })
  async deleteHistory(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.webSearchService.deleteHistory(userId, id);
  }
}

