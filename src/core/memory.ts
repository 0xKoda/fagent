/**
 * Memory Management System
 * Handles the storage and retrieval of conversation history and context:
 * - Manages message history across different platforms
 * - Implements context window management
 * - Handles conversation state and thread tracking
 */

import type { Env } from './types';
import { Logger } from './logger';

const MEMORY_TYPES = {
  CONVERSATION: 'conversation',
  LONG_TERM: 'long_term'
};

const TTL = {
  CONVERSATION: 60 * 60 * 24, // 24 hours
  LONG_TERM: 60 * 60 * 24 * 30 // 30 days
};

export class Memory {
  private kv: KVNamespace;
  private isAvailable: boolean;

  constructor(env: Env | KVNamespace) {
    if (!env) {
      throw new Error('Memory requires either Env or KVNamespace');
    }
    
    // Handle both full env object and direct KV namespace
    this.kv = (env as Env).agent_memory || env as KVNamespace;
    this.isAvailable = Boolean(this.kv);
    Logger.debug('Memory initialized with KV:', { isAvailable: this.isAvailable });
  }

  // Base KV operations
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable) return null;
    return await this.kv.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isAvailable) return;
    const options = ttl ? { expirationTtl: ttl } : undefined;
    await this.kv.put(key, value, options);
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable) return;
    await this.kv.delete(key);
  }

  // Conversation operations
  async storeConversation(userId: string, message: any) {
    if (!this.isAvailable) return;
    try {
      const key = `${MEMORY_TYPES.CONVERSATION}:${userId}`;
      const existing = await this.getConversations(userId);
      const conversations = existing ? [...existing, message] : [message];
      
      await this.set(key, JSON.stringify(conversations), TTL.CONVERSATION);
      Logger.debug('Stored conversation:', { userId, message });
    } catch (error) {
      Logger.error('Failed to store conversation:', error);
    }
  }

  async clearConversation(userId: string) {
    if (!this.isAvailable) return;
    const key = `${MEMORY_TYPES.CONVERSATION}:${userId}`;
    await this.delete(key);
    Logger.debug('Cleared conversation:', userId);
  }

  // Long-term memory operations
  async storeLongTerm(userId: string, memory: any) {
    if (!this.isAvailable) return;
    try {
      const key = `${MEMORY_TYPES.LONG_TERM}:${userId}`;
      const existing = await this.getLongTerm(userId);
      const memories = existing ? [...existing, memory] : [memory];
      
      await this.set(key, JSON.stringify(memories), TTL.LONG_TERM);
      Logger.debug('Stored long-term memory:', { userId, memory });
    } catch (error) {
      Logger.error('Failed to store long-term memory:', error);
    }
  }

  async clearLongTerm(userId: string) {
    if (!this.isAvailable) return;
    const key = `${MEMORY_TYPES.LONG_TERM}:${userId}`;
    await this.delete(key);
    Logger.debug('Cleared long-term memory:', userId);
  }

  // Retrieval operations
  async getConversations(userId: string): Promise<any[]> {
    if (!this.isAvailable) return [];
    try {
      const key = `${MEMORY_TYPES.CONVERSATION}:${userId}`;
      const data = await this.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      Logger.error('Failed to get conversations:', error);
      return [];
    }
  }

  async getLongTerm(userId: string): Promise<any[]> {
    if (!this.isAvailable) return [];
    try {
      const key = `${MEMORY_TYPES.LONG_TERM}:${userId}`;
      const data = await this.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      Logger.error('Failed to get long-term memories:', error);
      return [];
    }
  }

  async getAllMemories(userId: string) {
    if (!this.isAvailable) return { conversations: [], longTerm: [] };
    try {
      const [conversations, longTerm] = await Promise.all([
        this.getConversations(userId),
        this.getLongTerm(userId)
      ]);

      return {
        conversations: conversations || [],
        longTerm: longTerm || []
      };
    } catch (error) {
      Logger.error('Failed to get all memories:', error);
      return { conversations: [], longTerm: [] };
    }
  }

  formatMemoriesForContext(memories: any) {
    const recentConversations = memories.conversations
      .slice(-5)
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n');

    const relevantLongTerm = memories.longTerm
      .slice(-3)
      .map((m: any) => `Previous ${m.type}: ${m.action || m.content}`)
      .join('\n');

    return `Recent conversations:\n${recentConversations}\n\nRelevant history:\n${relevantLongTerm}`;
  }
}
