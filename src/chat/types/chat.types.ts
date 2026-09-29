import type {
  AIProviderType,
  MessageRole,
} from '../../generated/client/enums.js';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  providerType?: AIProviderType | null;
  modelName?: string | null;
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: ChatMessage | null;
}

export interface ChatResponse {
  success: boolean;
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  provider: {
    id: string;
    name: string;
    type: AIProviderType;
    model: string;
  };
}

export interface ConversationListResponse {
  success: boolean;
  count: number;
  conversations: ConversationSummary[];
}

export interface ConversationDetailResponse {
  success: boolean;
  conversation: {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    messages: ChatMessage[];
  };
}

export interface StreamChunkEvent {
  conversationId: string;
  chunk: string;
  done: boolean;
}
