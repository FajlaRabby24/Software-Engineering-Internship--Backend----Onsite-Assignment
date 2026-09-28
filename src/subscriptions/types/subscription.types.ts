import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../generated/client/enums.js';

export interface SubscriptionStatusResponse {
  success: boolean;
  subscription: {
    id: string;
    userId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    isActive: boolean;
    startDate: Date;
    endDate: Date | null;
    isLifetime: boolean;
  };
}
