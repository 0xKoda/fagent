/**
 * Core Type Definitions
 * Contains all shared types and interfaces:
 * - Platform-specific configuration types
 * - Message and author interfaces
 * - Environment configuration types
 * - Shared utility types
 */

export interface Env {
  // KV Namespace for agent memory
  KV: KVNamespace;
  agent_memory: KVNamespace;

  // Feature flags
  ENABLE_TELEGRAM: boolean | string;
  ENABLE_FARCASTER: boolean | string;
  ENABLE_TWITTER: boolean | string;

  LLM_MODEL: string;

  // Telegram configuration
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;

  // Twitter configuration
  TWITTER_API_KEY: string;
  TWITTER_API_KEY_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_TOKEN_SECRET: string;
  TWITTER_COOKIES: string;
  TWITTER_EMAIL: string;
  TWITTER_USERNAME: string;
  TWITTER_PASSWORD: string;

  // Farcaster configuration
  FARCASTER_NEYNAR_API_KEY: string;
  FARCASTER_NEYNAR_SIGNER_UUID: string;
  FARCASTER_FID: string;

  // OpenRouter configuration
  OPENROUTER_API_KEY: string;

  // Cloudflare AI Gateway configuration
  USE_CF_GATEWAY?: string;
  CF_ACCOUNT_ID?: string;
  CF_GATEWAY_ID?: string;
}

export interface Author {
  username: string;
  displayName: string;
  fid?: string;      // Farcaster-specific (numeric FID)
  custody_address?: string; // Farcaster-specific
  chatId?: number;   // Telegram-specific
  verifications?: string[]; // Farcaster-specific
}

export interface Message {
  id: string;
  text: string;
  author: Author;
  timestamp: number;
  platform: 'farcaster' | 'telegram' | 'twitter';
  replyTo?: string;
  hash?: string;      // Farcaster-specific (cast hash)
  thread_hash?: string; // Farcaster-specific
  parent_hash?: string; // Farcaster-specific
  parent_url?: string;  // Farcaster-specific
  embeds?: any[];      // Farcaster-specific
  raw: any;           // Platform-specific raw data
}

export interface ActionResult {
  text: string;
  shouldSendMessage: boolean;
  context?: string;
  embeds?: any[];   // For rich media attachments
}

export interface MemoryEntry {
  type: 'conversation' | 'long_term';
  content: string;
  timestamp: number;
  ttl: number;
}

// Base interface for client configuration
export interface ClientConfig {
  enabled: boolean;
  env: Env;
}

// Client-specific configurations
export interface TelegramConfig extends ClientConfig {
  botToken: string;
}

export interface FarcasterConfig extends ClientConfig {
  fid: string;
  neynarApiKey: string;
  signerUuid: string;
}

export interface AgentConfig {
  env: Env;
  memory?: KVNamespace;
  character?: any;
  telegramConfig?: TelegramConfig;
  farcasterConfig?: FarcasterConfig;
}

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
  type: string;
}

export interface TwitterConfig extends ClientConfig {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
}
