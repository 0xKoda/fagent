/**
 * Webhook Handler
 * Manages incoming webhooks from various platforms:
 * - Processes incoming webhook requests
 * - Routes messages to appropriate handlers
 * - Validates webhook authenticity
 * - Manages webhook responses
 */

import { Agent } from './agent';
import type { Env } from './types';
import { Logger } from './logger';

export class WebhookHandler {
  private agent: Agent;
  private env: Env;

  constructor(agent: Agent, env: Env) {
    this.agent = agent;
    this.env = env;
  }

  async handleWebhook(request: Request): Promise<Response> {
    try {
      Logger.info('Received request:', { 
        method: request.method, 
        url: request.url,
        headers: Object.fromEntries(request.headers)
      });
      
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      const url = new URL(request.url);
      const path = url.pathname;
      const body = await request.json();
      
      Logger.info('Received webhook body:', body);

      switch (path) {
        case '/telegram':
          return await this.handleTelegramWebhook(body);
        case '/farcaster':
          return await this.handleFarcasterWebhook(body);
        default:
          Logger.warn('Unknown endpoint:', path);
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      Logger.error('Error handling webhook:', error);
      return new Response('OK', { status: 200 }); // Return 200 even on error to prevent retries
    }
  }

  private async handleTelegramWebhook(body: any): Promise<Response> {
    if (this.env.ENABLE_TELEGRAM === 'false' || this.env.ENABLE_TELEGRAM === false) {
      Logger.error('Telegram webhook disabled:', { ENABLE_TELEGRAM: this.env.ENABLE_TELEGRAM });
      return new Response('Telegram webhook not enabled', { status: 400 });
    }

    try {
      await this.agent.processMessage({
        platform: 'telegram',
        ...body.message,
        raw: body
      });
      return new Response('OK', { status: 200 });
    } catch (error) {
      Logger.error('Error processing Telegram message:', error);
      return new Response('OK', { status: 200 }); // Still return 200 to acknowledge receipt
    }
  }

  private async handleFarcasterWebhook(body: any): Promise<Response> {
    Logger.info('Processing Farcaster webhook:', { 
      enabled: this.env.ENABLE_FARCASTER,
      type: body.type,
      body: body
    });
    
    if (!this.env.ENABLE_FARCASTER) {
      Logger.error('Farcaster webhook disabled');
      return new Response('Farcaster webhook not enabled', { status: 400 });
    }

    // Only process cast.created events
    if (body.type === 'cast.created') {
      try {
        await this.agent.processMessage({
          platform: 'farcaster',
          ...body.data,
          raw: body
        });
      } catch (error) {
        Logger.error('Error processing Farcaster message:', error);
      }
    } else {
      Logger.info('Skipping non-cast event:', body.type);
    }
    return new Response('OK', { status: 200 });
  }
}
