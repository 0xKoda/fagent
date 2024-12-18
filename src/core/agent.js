/**
 * Core agent logic and message bus
 */

import character from '../config/character.json';
import { Memory } from './memory.js';
import { loadActions } from '../actions';

// Trim response to Farcaster's character limit
function trimToFarcasterLimit(text) {
  const FARCASTER_LIMIT = 280;
  if (text.length <= FARCASTER_LIMIT) return text;

  // Try to cut at the last sentence
  let trimmed = text.slice(0, FARCASTER_LIMIT);
  const lastPeriod = trimmed.lastIndexOf('.');
  
  if (lastPeriod > 0) {
    trimmed = trimmed.slice(0, lastPeriod + 1);
  }

  return trimmed;
}

export class Agent {
  constructor(env) {
    this.env = env;
    this.memory = new Memory(env);
    this.openRouterKey = env.OPENROUTER_API_KEY;
    // Initialize actions with environment
    const rawActions = loadActions();
    this.actions = Object.fromEntries(
      Object.entries(rawActions).map(([key, action]) => [key, action.setEnv(env)])
    );
    this.character = character;
  }

  // Process incoming messages
  async processMessage(message) {
    try {
      const userMessage = message.text;
      const parentHash = message.hash;
      const authorFid = message.author?.fid;
      
      if (!authorFid) {
        console.error('Missing author FID in message:', message);
        throw new Error('Invalid message format: missing author FID');
      }

      // Get memory context
      let context = '';
      try {
        const memories = await this.memory.getAllMemories(authorFid);
        context = this.formatMemoriesForContext(memories);
      } catch (error) {
        console.error('Failed to get memories:', error);
        // Continue without memory context
      }

      // Check for actions first
      for (const action of Object.values(this.actions)) {
        if (action.shouldExecute && action.shouldExecute(userMessage)) {
          console.log(`Executing action: ${action.name}`);
          const result = await action.execute({ text: userMessage, author: message.author });
          
          if (result.shouldSendMessage) {
            // If action has a response to send
            await this.publishCast(result.text, parentHash, result.embeds);
            return result.text;
          } else if (result.context) {
            // If action provides context for LLM
            context += '\n' + result.context;
          }
        }
      }

      // Process message and generate response
      const response = await this.generateResponse(userMessage, context);
      await this.publishCast(response, parentHash);
      
      try {
        await this.memory.storeConversation(authorFid, {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString()
        });
        
        await this.memory.storeConversation(authorFid, {
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to store conversation:', error);
        // Continue even if memory storage fails
      }
      
      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  async publishCast(text, parentHash = null, embeds = null) {
    const apiKey = this.env.FARCASTER_NEYNAR_API_KEY;
    console.log('API Key available:', Boolean(apiKey));
    if (apiKey) {
      console.log('API Key starts with:', apiKey.substring(0, 4) + '...');
    }

    const body = {
      signer_uuid: this.env.FARCASTER_NEYNAR_SIGNER_UUID,
      text: text,
      parent: parentHash,
      idem: crypto.randomUUID().slice(0, 16)
    };

    // Add embeds if provided
    if (embeds) {
      body.embeds = embeds;
      console.log('Adding embeds to cast:', JSON.stringify(embeds));
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    };

    console.log('Request headers:', JSON.stringify(options.headers, null, 2));
    console.log('Request body:', JSON.stringify(body, null, 2));

    const response = await fetch('https://api.neynar.com/v2/farcaster/cast', options);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Neynar API error response:', error);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`Failed to publish cast: ${error.message || 'Unknown error'} (Status: ${response.status})`);
    }

    return response.json();
  }

  // Handle action commands
  async handleAction(actionName, text, author) {
    const action = this.actions[actionName];
    if (!action) {
      return { text: `Unknown command /${actionName}` };
    }

    try {
      const result = await action.execute({ text, author });

      // Store action in memory
      await this.memory.storeLongTerm(author.fid, {
        type: 'action',
        action: actionName,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error(`Action ${actionName} failed:`, error);
      return { text: 'Sorry, that action failed' };
    }
  }

  // Generate response using OpenRouter API
  async generateResponse(text, context) {
    // Combine all context
    const fullContext = context;
    console.log('Full context:', fullContext);

    // Generate response using OpenRouter
    const response = await this.generateLLMResponse([
      { role: "system", content: this.character.system_prompt },
      { role: "system", content: fullContext },
      { role: "user", content: text }
    ]);

    return response;
  }

  // Call OpenRouter API directly
  async generateLLMResponse(messages) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterKey}`,
        'X-Title': 'Ragent',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Prepare context from memories
  prepareContext(memories) {
    const recentConversations = memories.conversations
      .slice(-5)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const relevantLongTerm = memories.longTerm
      .slice(-3)
      .map(m => `Previous ${m.type}: ${m.action || m.content}`)
      .join('\n');

    return `Recent conversations:\n${recentConversations}\n\nRelevant history:\n${relevantLongTerm}`;
  }

  formatMemoriesForContext(memories) {
    const recentConversations = memories.conversations
      .slice(-5)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const relevantLongTerm = memories.longTerm
      .slice(-3)
      .map(m => `Previous ${m.type}: ${m.action || m.content}`)
      .join('\n');

    return `Recent conversations:\n${recentConversations}\n\nRelevant history:\n${relevantLongTerm}`;
  }
}
