import type { AIProviderType } from '../../generated/client/enums.js';

export interface AIProviderResponseData {
  id: string;
  name: string;
  type: AIProviderType;
  apiKey: string;
  baseUrl: string | null;
  models: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProviderResponse {
  success: boolean;
  message?: string;
  provider: AIProviderResponseData;
}
