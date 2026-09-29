import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatService } from '../chat/chat.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import type {
  RecentSearchesResponse,
  SearchHistoryItem,
  SearchHistoryListResponse,
  SearchSuggestionsResponse,
  WebSearchResponse,
  WebSource,
} from './types/web-search.types.js';

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  // Cache TTL: 2 hours
  private readonly CACHE_TTL_MS = 2 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Searches DuckDuckGo HTML endpoint and extracts top search results
   * without needing third-party API keys.
   */
  async scrapeWebResults(
    query: string,
    maxResults: number = 5,
  ): Promise<WebSource[]> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encodeURIComponent(query)}&b=`,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        this.logger.warn(
          `DuckDuckGo search returned HTTP ${response.status}. Falling back to empty sources.`,
        );
        return [];
      }

      const html = await response.text();
      return this.parseDuckDuckGoHtml(html, maxResults);
    } catch (error) {
      this.logger.error(
        `Failed to scrape search results for query "${query}": ${String(error)}`,
      );
      return [];
    }
  }

  /**
   * Parses DuckDuckGo HTML output to extract titles, clean URLs, and snippets.
   */
  private parseDuckDuckGoHtml(html: string, maxResults: number): WebSource[] {
    const results: WebSource[] = [];

    // DuckDuckGo HTML results are wrapped in <div class="result ..."> blocks
    const resultBlocks = html.split(
      /<div class="[^"]*result\s+results_links[^"]*">/i,
    );

    for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
      const block = resultBlocks[i];

      // Extract title and URL (supports result__a, result__title, result__snippet, result__url)
      const titleMatch =
        block.match(
          /<a class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
        ) ||
        block.match(
          /<a class="[^"]*result__title[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
        ) ||
        block.match(
          /<a class="result__snippet[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
        ) ||
        block.match(
          /<a class="result__url[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
        );

      // Extract snippet
      const snippetMatch =
        block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/i) ||
        block.match(/<div class="result__snippet[^>]*>([\s\S]*?)<\/div>/i);

      if (titleMatch) {
        let rawUrl = titleMatch[1];
        let title = this.stripHtml(titleMatch[2]).trim();

        // DuckDuckGo redirects through /l/?uddg=<actual_url>
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch && uddgMatch[1]) {
            rawUrl = decodeURIComponent(uddgMatch[1]);
          }
        } else if (rawUrl.startsWith('//')) {
          rawUrl = `https:${rawUrl}`;
        }

        const snippet = snippetMatch
          ? this.stripHtml(snippetMatch[1]).trim()
          : '';

        if (title && rawUrl.startsWith('http')) {
          results.push({
            title,
            url: rawUrl,
            snippet,
          });
        }
      }
    }

    return results;
  }

  private stripHtml(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Executes AI-assisted Web Search:
   * 1. Checks SearchCache (Bonus)
   * 2. If cached and not expired, records search in user's history and returns cached result
   * 3. If cache miss:
   *    a. Scrapes live web results
   *    b. Prompts AI model to synthesize an answer citing sources
   *    c. Stores in SearchCache (with 2-hour TTL) and saves to SearchHistory atomically
   */
  async search(userId: string, dto: SearchQueryDto): Promise<WebSearchResponse> {
    const rawQuery = dto.query.trim();
    const normalizedKey = rawQuery.toLowerCase();
    const now = new Date();

    // 1. Check SearchCache
    const cached = await this.prisma.searchCache.findUnique({
      where: { queryKey: normalizedKey },
    });

    if (cached && cached.expiresAt > now) {
      const cachedSources = cached.sources as unknown as WebSource[];

      // Record in user's history
      const historyRecord = await this.prisma.searchHistory.create({
        data: {
          userId,
          query: rawQuery,
          summary: cached.summary,
          sources: cached.sources as any,
        },
      });

      return {
        success: true,
        query: rawQuery,
        summary: cached.summary,
        sources: cachedSources,
        isCached: true,
        searchId: historyRecord.id,
        createdAt: historyRecord.createdAt,
      };
    }

    // 2. Fetch live web results
    const sources = await this.scrapeWebResults(rawQuery, 5);

    // 3. Resolve AI provider & generate synthesis
    const provider = await this.chatService.resolveProvider(dto.providerId);
    const selectedModel = dto.model || provider.defaultModel;

    let sourcesContext = '';
    if (sources.length > 0) {
      sourcesContext = sources
        .map(
          (s, i) =>
            `[${i + 1}] Title: ${s.title}\n    URL: ${s.url}\n    Snippet: ${s.snippet}`,
        )
        .join('\n\n');
    } else {
      sourcesContext = 'No live web results found.';
    }

    const systemPrompt =
      'You are an AI search assistant. Answer the user question based on the provided live web search results. Cite sources using [1], [2], etc. If web results do not contain the answer, provide your best accurate knowledge while noting it.';

    const userPrompt = `Live Web Search Results:\n${sourcesContext}\n\nUser Question:\n${rawQuery}`;

    const summary = await this.chatService.callLlm(provider, selectedModel, [
      { role: 'SYSTEM', content: systemPrompt },
      { role: 'USER', content: userPrompt },
    ]);

    const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

    // 4. Save to cache and search history atomically
    const [, historyRecord] = await this.prisma.$transaction([
      this.prisma.searchCache.upsert({
        where: { queryKey: normalizedKey },
        create: {
          queryKey: normalizedKey,
          summary,
          sources: sources as any,
          expiresAt,
        },
        update: {
          summary,
          sources: sources as any,
          expiresAt,
        },
      }),
      this.prisma.searchHistory.create({
        data: {
          userId,
          query: rawQuery,
          summary,
          sources: sources as any,
        },
      }),
    ]);

    return {
      success: true,
      query: rawQuery,
      summary,
      sources,
      isCached: false,
      searchId: historyRecord.id,
      createdAt: historyRecord.createdAt,
    };
  }

  /**
   * Retrieves paginated search history for logged-in user
   */
  async getHistory(
    userId: string,
    limit: number = 20,
  ): Promise<SearchHistoryListResponse> {
    const items = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted: SearchHistoryItem[] = items.map((item) => ({
      id: item.id,
      query: item.query,
      summary: item.summary,
      sources: item.sources as unknown as WebSource[],
      createdAt: item.createdAt,
    }));

    return {
      success: true,
      count: formatted.length,
      history: formatted,
    };
  }

  /**
   * Returns recent unique search query strings for user chips/dropdown
   */
  async getRecentSearches(
    userId: string,
    limit: number = 5,
  ): Promise<RecentSearchesResponse> {
    const records = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { query: true },
      take: 20,
    });

    // Deduplicate queries while preserving latest order
    const seen = new Set<string>();
    const uniqueQueries: string[] = [];

    for (const r of records) {
      const q = r.query.trim();
      if (!seen.has(q.toLowerCase())) {
        seen.add(q.toLowerCase());
        uniqueQueries.push(q);
        if (uniqueQueries.length >= limit) break;
      }
    }

    return {
      success: true,
      queries: uniqueQueries,
    };
  }

  /**
   * Provides search autocomplete suggestions based on historical queries
   */
  async getSuggestions(prefix: string): Promise<SearchSuggestionsResponse> {
    const cleanPrefix = prefix.trim();
    if (!cleanPrefix) {
      return {
        success: true,
        query: prefix,
        suggestions: [],
      };
    }

    const matches = await this.prisma.searchHistory.findMany({
      where: {
        query: {
          contains: cleanPrefix,
          mode: 'insensitive',
        },
      },
      select: { query: true },
      distinct: ['query'],
      take: 7,
    });

    return {
      success: true,
      query: cleanPrefix,
      suggestions: matches.map((m) => m.query),
    };
  }

  /**
   * Deletes a search history record
   */
  async deleteHistory(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.searchHistory.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Search history record not found');
    }

    await this.prisma.searchHistory.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Search history record deleted successfully',
    };
  }
}
