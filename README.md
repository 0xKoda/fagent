# Farcaster Agent Template

This template provides a foundation for building your own Farcaster agent using Cloudflare Workers. It includes a built-in memory system, character customization, and an extensible action framework.

## Prerequisites

- [Neynar](https://neynar.com) developer account
- [Cloudflare](https://cloudflare.com) account
- [OpenRouter](https://openrouter.ai) account
- Node.js and npm installed

## Quick Start

1. **Create a new Cloudflare Worker project**
```bash
npm create cloudflare@latest my-farcaster-agent
cd my-farcaster-agent
```

2. **Copy Template Files**
- Copy all contents from this template directory into your worker's `src` directory

3. **Install Dependencies**
```bash
npm install
```

## Configuration

### 1. Create wrangler.toml

Create a `wrangler.toml` file in your project root:

```toml
name = "farcaster-agent"
main = "src/index.js"
compatibility_date = "2023-01-01"
node_compat = true

[vars]
FARCASTER_FID = "your_fid"
FARCASTER_NEYNAR_SIGNER_UUID = "your_signer_uuid"
FARCASTER_NEYNAR_API_KEY = "your_neynar_key"
OPENROUTER_API_KEY = "your_openrouter_key"

# KV namespace binding
[[kv_namespaces]]
binding = "AGENT_KV"
id = "your_kv_namespace_id"
```

### 2. Set Up Cloudflare KV

```bash
# Create the KV namespace
npx wrangler kv:namespace create AGENT_KV
```

Add the returned KV namespace ID to your `wrangler.toml`.

### 3. Configure Your Agent's Character

Edit `src/config/character.json` to define your agent's personality:

```json
{
  "name": "YourAgent",
  "bio": [
    "A knowledgeable AI agent on Farcaster",
    "Specializes in [your specialty]"
  ],
  "style": {
    "tone": [
      "friendly but professional",
      "technically accurate"
    ],
    "writing_style": [
      "use clear explanations",
      "maintain conversation context"
    ]
  },
  "system_prompt": "You are [name], [key characteristics]..."
}
```

### 4. Set Up Neynar Webhook

1. Create a Farcaster account through Neynar's API
2. Deploy your worker: `npx wrangler deploy`
3. In the Neynar dashboard:
   - Go to the webhooks tab
   - Create a new webhook
   - Enter your worker URL
   - Add your bot's FID to both `mentioned_fids` and `parent_author_fids`

## Creating Custom Actions

The agent uses an extensible action system. Here's how to add your own action:

1. Create a new file in the `actions` directory (e.g., `myaction.js`):
```javascript
import { BaseAction } from './base';

export class MyAction extends BaseAction {
  constructor() {
    super('myaction'); // Command name users will type
  }

  async execute(cast, context) {
    // Your action logic here
    return {
      success: true,
      response: "Action completed!"
    };
  }
}
```

2. Register your action in `actions/index.js`:
```javascript
import { MyAction } from './myaction';

const actions = {
  myaction: new MyAction()
};

export function loadActions() {
  return actions;
}
```

## Memory System

The agent includes a two-tier memory system:
- Conversation Memory: 24-hour TTL
- Long-term Memory: 30-day TTL

Memory is automatically managed through Cloudflare KV.

## Development Tips

- Test locally with `npx wrangler dev`
- Monitor logs with `npx wrangler tail`
- Use environment variables for all sensitive keys
- Start with simple actions and gradually add complexity

## Environment Variables

Required environment variables:
- `FARCASTER_FID`: Your Farcaster ID
- `FARCASTER_NEYNAR_SIGNER_UUID`: UUID from Neynar dashboard
- `FARCASTER_NEYNAR_API_KEY`: Neynar API key
- `OPENROUTER_API_KEY`: OpenRouter API key

## Deployment

```bash
# Deploy your worker
npx wrangler deploy

# Set environment variables
npx wrangler secret put FARCASTER_NEYNAR_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
```

## License

MIT License
