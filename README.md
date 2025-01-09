# agent-template

A powerful serverless AI agent template for Cloudflare Workers that supports multiple platforms (Twitter, Telegram, Farcaster) with built-in memory management and LLM integration.

## Quick Start

Create a new project using this template:

```bash
npm create cloudflare@latest -- my-first-worker --template 0xkoda/fagent
```

## Initial Setup

If you are using cursor or windsurf, or another AI enabled code editor, you may benefit from [cursor rules](cursorrules.md).

### Platform Configuration

1. **Twitter Setup**
   -  **API-based Authentication**:
        - Set `ENABLE_TWITTER=true` in wrangler.toml
        - Add Twitter API credentials:
        ```bash
        npx wrangler secret put TWITTER_API_KEY
        npx wrangler secret put TWITTER_API_SECRET
        npx wrangler secret put TWITTER_ACCESS_TOKEN
        npx wrangler secret put TWITTER_ACCESS_SECRET
        ```

2. **Telegram Setup**
   - Create a new bot through [@BotFather](https://t.me/botfather)
   - Record the bot token for later use
   - After deployment, set webhook: `curl -F "url=https://your-worker-url/telegram" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook`

3. **Farcaster Setup**
   - Create/login to [Neynar account](https://neynar.com)
   - Generate a signer UUID in the dashboard
   - Create a new agent account if needed (can be done from dashboard)
   - Record your API key and signer UUID

### KV Storage Setup

1. Create the KV namespace:
```bash
npx wrangler kv:namespace create AGENT_KV
```

2. Add the returned values to your `wrangler.toml`:
```toml
# KV namespace for agent memory
[[kv_namespaces]]
binding = "agent_memory"
id = ""        # Add your KV namespace ID here
preview_id = "" # Add your preview ID here
```

## Features

- Multi-platform support (Twitter, Telegram, Farcaster)
- Twitter posts only (no replies or slop)
- Two-tier memory system with Cloudflare KV (long and short-term memory)
- Custom action system for handling commands
- Scheduled jobs support
- Open Router LLM integration for intelligent responses

## Memory System

The agent includes a sophisticated two-tier memory system:

- **Conversation Memory**: 24-hour TTL for recent interactions
- **Long-term Memory**: 30-day TTL for persistent knowledge

Memory is automatically managed through Cloudflare KV.

## Configuration

### 1. Character Setup

Create your agent's persona in `./config/character.json`. This defines your agent's personality and behavior.

### 2. Actions

1. Register new actions in the `/actions` directory
2. Add your action to `./actions/index.ts`

### 3. Secrets Management

Add required secrets using wrangler:

```bash
# Add platform-specific secrets
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put FARCASTER_NEYNAR_API_KEY
npx wrangler secret put FARCASTER_NEYNAR_SIGNER_UUID
npx wrangler secret put FARCASTER_FID
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_SECRET

# Add LLM API key
npx wrangler secret put OPENROUTER_API_KEY
```

### 4. LLM Configuration

This template uses [OpenRouter](https://openrouter.ai/models) to access various LLM models. OpenRouter provides a unified API to access models from different providers including OpenAI, Anthropic, and others.

1. Get your API key from [OpenRouter](https://openrouter.ai/)
2. Add the API key to your secrets:
```bash
npx wrangler secret put OPENROUTER_API_KEY
```

3. Configure your preferred model in `wrangler.toml`:
```toml
[vars]
LLM_MODEL = "openai/gpt-3.5-turbo"  # Model to use for LLM responses
```

Available models can be found in the [OpenRouter documentation](https://openrouter.ai/models).

### 5. Wrangler Configuration

Configure platform settings in `wrangler.toml`:

```toml
[vars]
ENABLE_FARCASTER = true         # Enable/disable Farcaster
ENABLE_TELEGRAM = true          # Enable/disable Telegram
ENABLE_TWITTER = false          # Enable Twitter API client
```

## Creating Scheduled Jobs
Scheduled jobs can define how your agent interfaces with social clients, like regular posts.
Scheduled jobs can perform an action or group of actions. 

The agent supports scheduled jobs through the `scheduler.ts` and `scheduled.ts` files in the `src/jobs` directory. 

For detailed examples and implementation details, see the [Creating Scheduled Jobs](docs.md#creating-scheduled-jobs) section in the documentation.

3. Configure the cron schedule in `wrangler.toml`:
```toml
[triggers]
crons = ["30 12 * * *"]  # Runs at 12:30 UTC daily
```

## Deployment

1. **Character Refinement**
Define your character in ./config/character.json

2. **Deploy Your Worker**
```bash
npx wrangler deploy
```

3. **Post-Deployment**
   - Configure Telegram webhook with your worker URL
   - Set up Neynar webhook in the dashboard with your worker URL
   - Test your bot's functionality on both platforms
   - Add any custom actions
   - Add any scheduled jobs (see [Creating Scheduled Jobs](#creating-scheduled-jobs))

## Roadmap

- [ ] Enhance memory system with vectorDB
- [ ] Add more platform integrations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
