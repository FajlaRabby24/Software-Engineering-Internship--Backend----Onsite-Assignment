export interface DashboardStatsResponse {
  success: boolean;
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
  };
  subscriptions: {
    total: number;
    free: number;
    premium: number;
    active: number;
    expired: number;
  };
  usage: {
    totalConversations: number;
    totalMessages: number;
    totalSearches: number;
  };
  providers: {
    total: number;
    active: number;
    defaultProvider: {
      id: string;
      name: string;
      type: string;
    } | null;
  };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  phoneNumber: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  subscription: {
    plan: string;
    status: string;
    endDate: Date | null;
  } | null;
  _count: {
    conversations: number;
    searchHistories: number;
  };
}

export interface AdminUsersListResponse {
  success: boolean;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  users: AdminUserItem[];
}

export interface UserStatusResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

export interface AdminSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    userId: string;
    plan: string;
    status: string;
    isActive: boolean;
    startDate: Date;
    endDate: Date | null;
  };
}

export interface AdminSubscriptionItem {
  id: string;
  userId: string;
  plan: string;
  status: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
}

export interface AdminSubscriptionsListResponse {
  success: boolean;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  subscriptions: AdminSubscriptionItem[];
}

export interface DailyTrendItem {
  date: string; // YYYY-MM-DD
  messages: number;
  conversations: number;
  searches: number;
  totalRequests: number;
}

export interface ProviderBreakdownItem {
  provider: string; // OPENAI, CLAUDE, GEMINI, or UNKNOWN
  count: number;
  percentage: number;
}

export interface ModelBreakdownItem {
  model: string;
  provider: string;
  count: number;
}

export interface UsageAnalyticsResponse {
  success: boolean;
  timeframe: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRequests: number;
    totalMessages: number;
    totalConversations: number;
    totalSearches: number;
  };
  dailyTrends: DailyTrendItem[];
  providerBreakdown: ProviderBreakdownItem[];
  modelBreakdown: ModelBreakdownItem[];
}



