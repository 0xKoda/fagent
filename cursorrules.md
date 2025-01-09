# Custom rules for Cursor:
This codebase is an AI agent hosted on a cloudflare worker. 
The agent interacts with telegram, twitter and farcaster, and generates posts via LLM.
The agent has persistant and temporary memory using cloudflare KV

# Important Rules
- Do Not make code changes to anything in ./core/ Unless instructed too.
- Most changes will occur in ./actions/ , ./jobs/ , ./config/ or index.ts

# Rules for Directory Changes

## ./actions/
- Each action must extend the base Action class
- Actions must implement both `shouldExecute` and `execute` methods
- Always validate user input in the `shouldExecute` method
- Keep action logic isolated and focused on a single responsibility
- Register new actions in `actions/index.ts`
- Do not modify existing action behavior without explicit instruction
- Include error handling and logging in all actions

## ./jobs/
- New jobs must be added to `scheduled.ts` and registered in `scheduler.ts`
- Each job should have clear error handling and logging
- Jobs should respect rate limits for social media platforms
- Avoid long-running operations that could timeout the worker
- Document any dependencies or external API calls

## ./config/
- Do not modify `character.json` without explicit instruction

## ./types/
- Only add new types, never modify existing ones
- Keep type definitions consistent across the codebase
- Document complex types thoroughly
- Use strict typing, avoid 'any'

# Scheduling Jobs
- When adding a new job, Ensure it is added to scheduled.ts, and that the schedule trigger is set in scheduler.ts
- Scheduled Jobs handle the timed interactions with the specifified client (telegram, twitter, farcaster)
- Jobs must include proper error handling and logging
- Consider rate limits and API quotas when scheduling, avoid retries.
- Use UTC time for all schedules

# Memory Management
- Use short-term memory for conversation context (24h TTL)
- Use long-term memory for persistent data (30d TTL)
- Always handle KV storage errors

# Social Media Integration
- Respect platform-specific rate limits
- Handle API errors gracefully
- Don't modify client implementations in core/
- Use appropriate retry strategies, avoid retries for twitter
- Validate content before posting
- Farcaster and Telegram operate via incoming webhooks with user messages
- Handle platform-specific content restrictions

# Wrangler Configuration
- Ensure that variables in wrangler are correctly set, and do not change them unless instructed. 
```toml
ENABLE_TELEGRAM = true
ENABLE_FARCASTER = true
ENABLE_TWITTER = false 
LLM_MODEL = "openai/gpt-3.5-turbo"  # Model to use for LLM responses
```

