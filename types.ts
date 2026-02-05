export interface ApiKeys {
  elevenLabsKey: string;
  elevenLabsAgentId: string;
  elevenLabsChatAgentId: string;
  n8nWebhookUrl?: string;
  n8nApiKey?: string;
}

export interface SIPConfig {
  registrar: string;
  port: number;
  protocol: "TCP" | "TLS";
  username: string;
  password: string;
  displayName?: string;
  certificatePath?: string;
  isRegistered?: boolean;
}

export interface SIPContact {
  id: string;
  name: string;
  number: string;
  timestamp: number;
}

export interface SIPCall {
  callId: string;
  remoteNumber: string;
  direction: "incoming" | "outgoing";
  status: "connecting" | "connected" | "ended";
  duration: number;
  timestamp: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export enum AppState {
  AUTH = "AUTH",
  INITIAL_SETUP = "INITIAL_SETUP",
  SETUP = "SETUP",
  DASHBOARD = "DASHBOARD",
  ADMIN = "ADMIN",
}

export enum InteractionMode {
  VOICE = "VOICE",
  TEXT = "TEXT",
  SIP = "SIP",
}
