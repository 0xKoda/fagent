import { Logger } from './logger';
import type { TwitterConfig } from './types';
import type { TwitterInterface } from './twitter_interface';

export class TwitterClient implements TwitterInterface {
  private apiKey: string;
  private apiKeySecret: string;
  private accessToken: string;
  private accessTokenSecret: string;
  private isInitialized: boolean = false;

  constructor(config: TwitterConfig) {
    Logger.info('Initializing Twitter client with config:', {
      hasApiKey: !!config.apiKey,
      hasApiKeySecret: !!config.apiKeySecret,
      hasAccessToken: !!config.accessToken,
      hasAccessTokenSecret: !!config.accessTokenSecret,
      apiKeyLength: config.apiKey?.length,
      accessTokenLength: config.accessToken?.length
    });

    this.apiKey = config.apiKey;
    this.apiKeySecret = config.apiKeySecret;
    this.accessToken = config.accessToken;
    this.accessTokenSecret = config.accessTokenSecret;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  private async generateAuthHeader(method: string, url: string, params: Record<string, string> = {}): Promise<string> {
    const oauth = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.accessToken,
      oauth_version: '1.0'
    };

    // Create parameter string
    const allParams = { ...params, ...oauth };
    const paramString = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    // Create signature base string
    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(this.apiKeySecret)}&${encodeURIComponent(this.accessTokenSecret)}`;

    // Create HMAC-SHA1 hash
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Sign the base string
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signatureBase)
    );
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Add signature to OAuth params
    const authParams = {
      ...oauth,
      oauth_signature: encodedSignature
    };

    // Create authorization header
    return 'OAuth ' + Object.entries(authParams)
      .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
      .join(', ');
  }

  async postTweet(text: string): Promise<void> {
    try {
      Logger.info('Attempting to post tweet:', text);

      if (!text) {
        throw new Error('Tweet text is required');
      }

      const url = 'https://api.twitter.com/2/tweets';
      const authHeader = await this.generateAuthHeader('POST', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Twitter API error: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      Logger.info('Successfully posted tweet:', data);
    } catch (error) {
      Logger.error('Error posting tweet. Full error:', error);
      Logger.error('Error name:', error.name);
      Logger.error('Error message:', error.message);
      if (error.data) {
        Logger.error('Error data:', error.data);
      }
      throw error;
    }
  }
}