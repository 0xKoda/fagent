/**
 * Main Application Entry Point
 * 
 * This file serves as the primary entry point for the Cloudflare Worker application.
 * It handles:
 * - HTTP request routing and webhook processing
 * - Scheduled job execution
 * 
 * The application exposes two main interfaces:
 * 1. fetch(): Handles incoming HTTP requests including webhooks and test endpoints
 * 2. scheduled(): Processes scheduled tasks like SARA's automated tweets
 * 
 * Environment variables are passed through the Env interface, providing
 * configuration for various services (Twitter, OpenAI, etc.)
 */
import type { Env, ScheduledEvent } from './core/types';
import { Agent } from './core/agent';
import { WebhookHandler } from './core/webhook';
import { Scheduler } from './jobs/scheduler';

export default {
    /**
   * Handles all incoming HTTP requests to the worker
   * @param request The incoming HTTP request
   * @param env Environment variables and bindings
   * @returns Response object with appropriate status and content
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const agent = new Agent(env);
    const webhookHandler = new WebhookHandler(agent, env);
    return await webhookHandler.handleWebhook(request);
  },

  /**
   * Handles scheduled events triggered by cron triggers
   * @param event The scheduled event containing timing information
   * @param env Environment variables and bindings
   * @param ctx Execution context for the worker
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const scheduler = new Scheduler(env);
    await scheduler.handleScheduledEvent(event);
  }
};