/**
 * Memory management system using Cloudflare KV
 */

const MEMORY_TYPES = {
  CONVERSATION: 'conversation',
  LONG_TERM: 'long_term'
};

const TTL = {
  CONVERSATION: 60 * 60 * 24, // 24 hours
  LONG_TERM: 60 * 60 * 24 * 30 // 30 days
};

export class Memory {
  constructor(env) {
    this.kv = env?.AGENT_KV;
    this.isAvailable = Boolean(this.kv);
  }

  async storeConversation(userId, message) {
    if (!this.isAvailable) return;
    try {
      const key = `${MEMORY_TYPES.CONVERSATION}:${userId}`;
      const existing = await this.getConversations(userId);
      const conversations = existing ? [...existing, message] : [message];
      
      await this.kv.put(key, JSON.stringify(conversations), {
        expirationTtl: TTL.CONVERSATION
      });
    } catch (error) {
      console.error('Failed to store conversation:', error);
    }
  }

  async storeLongTerm(userId, memory) {
    if (!this.isAvailable) return;
    try {
      const key = `${MEMORY_TYPES.LONG_TERM}:${userId}`;
      const existing = await this.getLongTerm(userId);
      const memories = existing ? [...existing, memory] : [memory];
      
      await this.kv.put(key, JSON.stringify(memories), {
        expirationTtl: TTL.LONG_TERM
      });
    } catch (error) {
      console.error('Failed to store long-term memory:', error);
    }
  }

  async getConversations(userId) {
    if (!this.isAvailable) return [];
    try {
      const key = `${MEMORY_TYPES.CONVERSATION}:${userId}`;
      const data = await this.kv.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  async getLongTerm(userId) {
    if (!this.isAvailable) return [];
    try {
      const key = `${MEMORY_TYPES.LONG_TERM}:${userId}`;
      const data = await this.kv.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get long-term memories:', error);
      return [];
    }
  }

  async getAllMemories(userId) {
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
      console.error('Failed to get all memories:', error);
      return { conversations: [], longTerm: [] };
    }
  }
}
