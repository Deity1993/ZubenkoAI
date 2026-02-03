
export interface ApiKeys {
  elevenLabsKey: string;
  elevenLabsAgentId: string;
  n8nWebhookUrl: string;
  n8nApiKey: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export enum AppState {
  AUTH = 'AUTH',
  INITIAL_SETUP = 'INITIAL_SETUP',
  SETUP = 'SETUP',
  DASHBOARD = 'DASHBOARD'
}

export enum InteractionMode {
  VOICE = 'VOICE',
  TEXT = 'TEXT'
}
