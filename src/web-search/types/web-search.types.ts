export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  summary: string;
  sources: WebSource[];
  isCached: boolean;
  searchId: string;
  createdAt: Date;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  summary: string;
  sources: WebSource[];
  createdAt: Date;
}

export interface SearchHistoryListResponse {
  success: boolean;
  count: number;
  history: SearchHistoryItem[];
}

export interface RecentSearchesResponse {
  success: boolean;
  queries: string[];
}

export interface SearchSuggestionsResponse {
  success: boolean;
  query: string;
  suggestions: string[];
}
