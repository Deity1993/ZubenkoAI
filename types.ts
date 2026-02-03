
export interface ApiKeys {
  elevenLabsKey: string;
  elevenLabsAgentId: string;
  elevenLabsChatAgentId: string;
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
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN',
}

export enum InteractionMode {
  VOICE = 'VOICE',
  TEXT = 'TEXT'
}
