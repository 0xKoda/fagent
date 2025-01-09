# AI Agent Template

This template helps you create an AI agent that can:
- Interact with users through Twitter, Telegram, and Farcaster
- Run scheduled jobs to post updates
- Use LLMs (like GPT-3.5) to generate responses
- Store conversation memory in Cloudflare KV

## Setup Instructions

1. **Install**
Create a new project using this template:

```bash
npm create cloudflare@latest -- my-first-worker --template 0xkoda/fagent
```

2. **Configure Wrangler**
   -  Configure which clients to use, and update their secrets

3. **Set Up KV Storage**
   ```bash
   # Create KV namespace
   wrangler kv:namespace create "agent_memory"
   # Create preview namespace
   wrangler kv:namespace create "agent_memory" --preview
   ```
   Update `wrangler.toml` with the returned IDs

4. **Configure Environment Variables**
   ```bash
   # Set required secrets
   wrangler secret put OPENROUTER_API_KEY

   # Telegram secrets
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_WEBHOOK_SECRET

   # Farcaster secrets
   wrangler secret put FARCASTER_NEYNAR_API_KEY
   wrangler secret put FARCASTER_NEYNAR_SIGNER_UUID
   wrangler secret put FARCASTER_FID

   # Twitter secrets 
   # For API-based authentication:
   wrangler secret put TWITTER_API_KEY
   wrangler secret put TWITTER_API_SECRET
   wrangler secret put TWITTER_ACCESS_TOKEN
   wrangler secret put TWITTER_ACCESS_SECRET
   
   ```

5. **Platform Setup**
   - **Twitter**:
 **API-based**:
           - Set `ENABLE_TWITTER=true` in wrangler.toml
           - Get your API credentials from Twitter Developer Portal
   
   - **Telegram**:
     1. Create a bot with [@BotFather](https://t.me/botfather)
     2. Set the webhook URL to `https://your-worker.workers.dev/telegram`
   
   - **Farcaster**:
     1. Get API credentials from [Neynar](https://neynar.com)
     2. Configure webhook in Neynar dashboard to `https://your-worker.workers.dev/farcaster`

## Creating Actions

1. Create a new file in `src/actions/your_action.ts`:
   ```typescript
   import { Action } from './base';
   import type { Message, ActionResult } from '../types';

   export class YourAction extends Action {
     constructor() {
       super('your_action', 'Description of your action');
     }

     shouldExecute(message: Message): boolean {
       // Define when this action should trigger
       return message.text?.includes('/your_command') ?? false;
     }

     async execute(message: Message): Promise<ActionResult> {
       // Implement your action logic
       return {
         text: "Your response",
         shouldSendMessage: true,
         context: "Context for LLM"
       };
     }
   }
   ```

2. Register your action in `src/actions/index.ts`:
   ```typescript
   import { YourAction } from './your_action';
   
   const actions: Record<string, Action> = {
     your_action: new YourAction()
   };
   ```

## Creating Scheduled Jobs

Scheduled jobs are managed through two main files: `scheduler.ts` and `scheduled.ts` in the `src/jobs` directory.

1. First, create your job in `src/jobs/scheduled.ts`:
   ```typescript
   export class ScheduledJobs {
     private agent: Agent;
     private env: Env;

     constructor(agent: Agent, env: Env) {
       this.agent = agent;
       this.env = env;
     }

     async runMarketAnalysis() {
       try {
         // Gather data
         const marketData = await this.getMarketData();
         
         // Generate analysis using LLM
         const analysis = await this.agent.generateLLMResponse([
           { 
             role: "system", 
             content: "You are a market analyst. Analyze this data." 
           },
           { 
             role: "user", 
             content: marketData 
           }
         ]);

         // Post to multiple platforms
         await Promise.all([
           this.agent.publishTweet(analysis),
           this.agent.publishFarcasterCast(analysis)
         ]);
       } catch (error) {
         Logger.error('Error in market analysis job:', error);
       }
     }
   }
   ```

2. Schedule the job in `src/jobs/scheduler.ts`:
   ```typescript
   export class Scheduler {
     private env: Env;
     private agent: Agent;
     private jobs: ScheduledJobs;

     constructor(env: Env) {
       this.env = env;
       this.agent = new Agent(env);
       this.jobs = new ScheduledJobs(this.agent, env);
     }

     async handleScheduledEvent(event: ScheduledEvent) {
       const hour = new Date(event.scheduledTime).getUTCHours();
       const minute = new Date(event.scheduledTime).getUTCMinutes();

       try {
         // Run market analysis at 12:30 UTC
         if (hour === 12 && minute === 30) {
           await this.jobs.runMarketAnalysis();
         }
       } catch (error) {
         Logger.error('Error in scheduled job:', error);
       }
     }
   }
   ```

3. Configure the schedule in `wrangler.toml`:
   ```toml
   [triggers]
   crons = ["30 12 * * *"]  # Runs at 12:30 UTC
   ```

## Deployment

**Deployment**
```bash
npx wrangler deploy
```

## Configuration Options

In `wrangler.toml`:
```toml
[vars]
ENABLE_TELEGRAM = true          # Enable/disable Telegram bot
ENABLE_FARCASTER = true        # Enable/disable Farcaster bot
ENABLE_TWITTER = false         # Enable/disable Twitter API client
LLM_MODEL = "openai/gpt-3.5-turbo"  # LLM model to use
```

## Best Practices

1. **Error Handling**
   - Always use try-catch blocks in actions and jobs
   - Log errors using the Logger utility
   - Provide meaningful error messages to users

2. **Rate Limiting**
   - Be mindful of API rate limits, you can get your account shadow-banned on X very easily
   - Implement retries for transient failures, but not on X client.
   - Add delays between consecutive API calls

3. **Testing**
   - Test your actions with various inputs
   - Verify scheduled jobs work as expected
   - Test error handling scenarios

4. **Security**
   - Never commit secrets to version control, use wrangler secret put to encrypt secrets.
   - Validate user inputs in actions
   - Use environment variables for client configuration

## Support

For issues and feature requests, please open an issue in the GitHub repository.
