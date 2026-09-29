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
