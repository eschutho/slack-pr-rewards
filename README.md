# slack-pr-rewards

A Slack app that rewards users for engaging with PR reviews through emoji reactions. Earn points for giving and receiving reactions!

## Features

- 🎯 **Point System**: Earn points for giving and receiving emoji reactions
- 🏆 **Leaderboard**: Track top contributors with `/rewards` command
- ⭐ **Bonus Emojis**: Get 2x points for review-related emojis (✅, 🚀, 👀, etc.)
- 📊 **Personal Stats**: Check your stats with `/rewards me`

## How It Works

| Action | Points |
|--------|--------|
| Giving a tracked reaction | 1 pt |
| Receiving a tracked reaction | 2 pts |

**Tracked Emojis** (only these earn points):
- ✅ `:white_check_mark:` - Approval/checkbox
- 💬 `:speech_balloon:` - Comment bubble
- ❗ `:exclamation:` - Exclamation mark
- ❓ `:question:` - Question mark

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From scratch" and give it a name (e.g., "PR Rewards")
3. Select your workspace

### 2. Configure App Permissions

Navigate to **OAuth & Permissions** and add these Bot Token Scopes:
- `channels:history` - View messages in public channels
- `channels:read` - View basic channel info
- `chat:write` - Send messages
- `commands` - Add slash commands
- `reactions:read` - View emoji reactions
- `users:read` - View users and their basic info

### 3. Enable Socket Mode

1. Go to **Socket Mode** and enable it
2. Generate an App-Level Token with `connections:write` scope
3. Save the token (starts with `xapp-`)

### 4. Enable Event Subscriptions

1. Go to **Event Subscriptions** and enable events
2. Subscribe to these bot events:
   - `reaction_added`
   - `reaction_removed`

### 5. Create Slash Command

1. Go to **Slash Commands** and click "Create New Command"
2. Command: `/rewards`
3. Description: "View the PR review rewards leaderboard"
4. Usage Hint: `[me|help|number]`

### 6. Install the App

1. Go to **Install App** and click "Install to Workspace"
2. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 7. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your tokens:
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
```

### 8. Run the App

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/rewards` | Show the leaderboard |
| `/rewards me` | Show your personal stats |
| `/rewards help` | Show help message |
| `/rewards 5` | Show top 5 on leaderboard |

## Project Structure

```
src/
├── index.ts              # App entry point
├── handlers/
│   ├── reactions.ts      # Reaction event handlers
│   └── commands.ts       # Slash command handlers
├── services/
│   └── rewards.ts        # Reward calculation logic
├── storage/
│   └── store.ts          # JSON file-based storage
└── types/
    └── index.ts          # TypeScript type definitions
```

## Development

```bash
# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

## License

GPL-3.0
