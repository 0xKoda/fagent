/**
 * Enhanced Agent class with improved robustness and features
 * 
 * Key improvements:
 * - Rate limiting and retry logic for API calls
 * - Enhanced error handling and logging
 * - Message validation and sanitization
 * - Memory caching mechanism
 * - Batched message processing
 */
import { TelegramClient } from './telegram';
import { FarcasterClient } from './farcaster';
import { Memory } from './memory';
import { Logger } from './logger';
import { TwitterClient } from './twitter';
import type { Message, Env, ActionResult, TelegramConfig, FarcasterConfig, TwitterConfig } from './types';
import { loadActions } from '../actions';
import character from '../config/character.json';

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
}

export class Agent {
  private env: Env;
  private memory?: Memory;
  private memoryCache: Map<string, any>;
  private telegram: TelegramClient | null = null;
  private farcaster: FarcasterClient | null = null;
  private twitter: TwitterClient | null = null;
  private character: typeof character;
  private actions: Record<string, any>;
  private rateLimits: Map<string, { count: number; resetTime: number }>;
  private messageQueue: Message[] = [];
  private processingQueue: boolean = false;
  
  // Configuration constants
  private static readonly RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxRequests: 50,
    timeWindow: 60000, // 1 minute
  };

  private static readonly RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
  };

  constructor(env: Env) {
    this.env = env;
    this.memory = new Memory({ agent_memory: env.agent_memory });
    this.character = character;
    this.actions = loadActions();
    this.memoryCache = new Map();
    this.rateLimits = new Map();
    
    // Initialize actions with env
    Object.values(this.actions).forEach(action => action.setEnv(env));
  }

  /**
   * Validates and sanitizes incoming messages
   * @param message The message to validate
   * @throws Error if message is invalid
   */
  private validateMessage(message: Message): void {
    if (!message.platform) {
      throw new Error('Message must have a platform');
    }

    if (!message.text || typeof message.text !== 'string') {
      throw new Error('Message must have valid text content');
    }

    if (!message.author || !message.author.username) {
      throw new Error('Message must have an author with a username');
    }

    // Sanitize text content
    message.text = message.text
      .trim()
      .replace(/[\\<>]/g, '') // Remove potentially harmful characters
      .slice(0, 2000); // Reasonable length limit
  }

  /**
   * Implements rate limiting logic
   * @param key The rate limit key (e.g., 'openai-api', 'telegram-api')
   * @returns boolean indicating if request should be allowed
   */
  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(key);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + Agent.RATE_LIMIT_CONFIG.timeWindow,
      });
      return true;
    }

    if (limit.count >= Agent.RATE_LIMIT_CONFIG.maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Implements exponential backoff retry logic
   * @param operation The async operation to retry
   * @param key Rate limit key for the operation
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    key: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < Agent.RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (!this.checkRateLimit(key)) {
          const waitTime = Math.min(
            Agent.RETRY_CONFIG.maxDelay,
            Agent.RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Operation failed, attempt ${attempt + 1}/${Agent.RETRY_CONFIG.maxRetries}:`, error);
        
        if (!this.shouldRetry(error)) {
          throw error;
        }
        
        const waitTime = Math.min(
          Agent.RETRY_CONFIG.maxDelay,
          Agent.RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError || new Error('Operation failed after all retries');
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors and rate limits
    return (
      error.name === 'NetworkError' ||
      error.message.includes('rate limit') ||
      (error.response && [429, 503, 502].includes(error.response.status))
    );
  }

  /**
   * Enhanced message processing with batching
   */
  async processMessage(message: Message): Promise<ActionResult> {
    this.validateMessage(message);
    this.messageQueue.push(message);
    
    if (!this.processingQueue) {
      return this.processMessageQueue();
    }
    
    return {
      text: 'Message queued for processing',
      shouldSendMessage: false,
    };
  }

  private async processMessageQueue(): Promise<ActionResult> {
    this.processingQueue = true;
    let result: ActionResult = {
      text: '',
      shouldSendMessage: false,
    };

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        result = await this.processMessageInternal(message);
      }
    } finally {
      this.processingQueue = false;
    }

    return result;
  }

  private async processMessageInternal(message: Message): Promise<ActionResult> {
    try {
      Logger.info('Processing message:', { platform: message.platform, text: message.text });

      const client = await this.initializeClient(message.platform);
      const transformedMessage = await this.transformMessage(message, client);
      
      // Check memory cache first
      const cacheKey = `${message.author.username}_${Date.now()}`;
      if (this.memoryCache.has(cacheKey)) {
        return this.memoryCache.get(cacheKey);
      }

      const actionResult = await this.checkActions(transformedMessage);
      if (actionResult) {
        if (actionResult.context) {
          const llmResponse = await this.withRetry(
            () => this.generateLLMResponse(
              [
                { role: "system", content: actionResult.context },
                { role: "user", content: actionResult.text }
              ],
              message.platform
            ),
            'llm-api'
          );
          
          const finalResponse = `${llmResponse}`;
          await this.sendReply(finalResponse, transformedMessage);
          
          return {
            text: finalResponse,
            shouldSendMessage: true,
          };
        } else {
          await this.sendReply(actionResult.text, transformedMessage);
          return actionResult;
        }
      }

      const conversationId = await this.getConversationId(transformedMessage);
      const history = await this.getHistory(conversationId);
      const longTermContext = await this.getLongTermContext(transformedMessage.author.username);
      
      const response = await this.generateResponse(transformedMessage, history, longTermContext);
      
      // Store in memory cache
      this.memoryCache.set(cacheKey, {
        text: response,
        shouldSendMessage: true,
      });

      // Store conversations
      await Promise.all([
        this.memory.storeConversation(conversationId, {
          role: 'user',
          content: transformedMessage.text,
        }),
        this.memory.storeConversation(conversationId, {
          role: 'assistant',
          content: response,
        })
      ]);

      await this.sendReply(response, transformedMessage);

      return {
        text: response,
        shouldSendMessage: true,
      };
    } catch (error) {
      Logger.error('Error processing message:', error);
      throw error;
    }
  }

  private async initializeClient(platform: string): Promise<any> {
    switch (platform) {
      case 'telegram':
        return this.initializeTelegramClient();
      case 'farcaster':
        return this.initializeFarcasterClient();
      case 'twitter':
        return this.initializeTwitterClient();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async transformMessage(message: Message, client: any): Promise<Message> {
    if (!client) {
      throw new Error(`Client not initialized for platform: ${message.platform}`);
    }

    const transformedMessage = client.transformWebhook(message.raw);
    if (!transformedMessage) {
      Logger.error('Failed to transform message:', message);
      throw new Error('Failed to transform message');
    }

    return transformedMessage;
  }

  private async getHistory(conversationId: string): Promise<any[]> {
    const cacheKey = `history_${conversationId}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    const history = await this.memory.getConversations(conversationId);
    this.memoryCache.set(cacheKey, history);
    return history;
  }

  // ... [Rest of the original methods remain unchanged]
}
