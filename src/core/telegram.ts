/**
 * Telegram Client Implementation
 * Handles all Telegram-related functionality:
 * - Sending messages to Telegram chats
 * - Processing incoming messages
 * - Managing Telegram-specific message formatting
 */
import { Logger } from './logger';
import type { Message, TelegramConfig } from './types';

export class TelegramClient {
  private token: string;

  constructor(config: TelegramConfig) {
    this.token = config.botToken;
  }

  /**
   * Send a message to a Telegram chat
   */
  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.token) {
      throw new Error('Telegram bot token not configured');
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        Logger.error('Failed to send Telegram message:', error);
        throw new Error(`Telegram API error: ${error.description}`);
      }

      Logger.debug('Sent Telegram message:', { chatId, text });
    } catch (error) {
      Logger.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  /**
   * Transform Telegram webhook to our Message type
   */
  transformWebhook(webhook: any): Message | null {
    try {
      if (!webhook.message) {
        Logger.info('No message in webhook:', webhook);
        return null;
      }

      const message = webhook.message;
      if (!message.text) {
        Logger.info('No text in message:', message);
        return null;
      }

      return {
        id: message.message_id.toString(),
        text: message.text,
        author: {
          username: message.from.username || String(message.from.id),
          displayName: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
          chatId: message.chat.id
        },
        timestamp: message.date * 1000,
        platform: 'telegram',
        replyTo: message.reply_to_message?.message_id?.toString(),
        raw: webhook
      };
    } catch (error) {
      Logger.error('Error transforming Telegram webhook:', error);
      return null;
    }
  }

}
