/**
 * Twitter Client Factory
 * Creates Twitter client instances using the official API:
 * - Manages client configuration and initialization
 * - Provides unified interface for Twitter interactions
 */
import { TwitterClient } from './twitter';
import type { Env } from './types';
import { Logger } from './logger';

export class TwitterFactory {
    static async createClient(env: Env) {
        if (!env.ENABLE_TWITTER) {
            throw new Error('Twitter API is not enabled. Set ENABLE_TWITTER to true');
        }
        
        Logger.info('Creating Twitter API Client');
        const client = new TwitterClient(env);
        await client.initialize();
        return client;
    }
}
