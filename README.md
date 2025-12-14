# Slack Emoji Rewards System 🎁

A Slack bot that creates a gamified rewards system based on emoji reactions. Users earn points when their messages receive emoji reactions from others.

## Features

- 🎯 **Point System**: Different emojis award different point values
- 🏆 **Leaderboard**: Track top contributors with `/rewards leaderboard`
- 📊 **Personal Stats**: Check your points with `/rewards`
- 🔄 **Real-time Tracking**: Points automatically update when reactions are added or removed
- 🚫 **No Self-Rewards**: Users can't earn points by reacting to their own messages

## Emoji Point Values

| Emoji | Points |
|-------|--------|
| 🏆 `:trophy:` | 10 |
| 💯 `:100:` | 5 |
| 🎉 `:tada:` | 5 |
| 🔥 `:fire:` | 3 |
| ❤️ `:heart:` | 2 |
| ⭐ `:star:` | 2 |
| 🙌 `:raised_hands:` | 2 |
| 👍 `:+1:` / `:thumbsup:` | 1 |
| 👏 `:clap:` | 1 |
| All other emojis | 1 |

## Setup

### Prerequisites

- Python 3.7 or higher
- A Slack workspace where you have permissions to install apps

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Rewards Bot") and select your workspace
4. Navigate to "OAuth & Permissions" and add these Bot Token Scopes:
   - `app_mentions:read`
   - `channels:history`
   - `chat:write`
   - `commands`
   - `reactions:read`
5. Navigate to "Event Subscriptions" and enable events
6. Subscribe to these bot events:
   - `app_mention`
   - `reaction_added`
   - `reaction_removed`
7. Navigate to "Socket Mode" and enable it
   - Generate an App-Level Token with `connections:write` scope
8. Navigate to "Slash Commands" and create:
   - `/rewards` - "Check reward points"
   - `/rewards-help` - "Show emoji point values and help"
9. Install the app to your workspace

### 2. Configure the Bot

1. Clone this repository:
   ```bash
   git clone https://github.com/eschutho/slack-pr-rewards.git
   cd slack-pr-rewards
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your Slack app credentials:
   - `SLACK_BOT_TOKEN`: Found in "OAuth & Permissions" (starts with `xoxb-`)
   - `SLACK_SIGNING_SECRET`: Found in "Basic Information"
   - `SLACK_APP_TOKEN`: The App-Level Token you generated (starts with `xapp-`)

### 3. Run the Bot

```bash
python app.py
```

You should see: `⚡️ Slack Rewards Bot is running!`

## Usage

### Commands

- `/rewards` - Check your own reward points
- `/rewards @user` - Check points for a specific user
- `/rewards leaderboard` - View the top 10 users
- `/rewards-help` - Show emoji point values and available commands

### How It Works

1. When someone reacts to a message with an emoji, the message author earns points
2. Different emojis are worth different point values (see table above)
3. Points are automatically removed if reactions are removed
4. Users cannot earn points by reacting to their own messages
5. All rewards data is stored in `rewards_data.json`

## Configuration

You can customize emoji point values by editing `config.py`:

```python
EMOJI_POINTS = {
    "+1": 1,
    "thumbsup": 1,
    "heart": 2,
    # Add or modify emoji values here
}

# Default points for any emoji not specified above
DEFAULT_EMOJI_POINTS = 1
```

## Data Storage

Rewards are stored in `rewards_data.json` in the following format:

```json
{
  "U12345678": 42,
  "U87654321": 38
}
```

This file is automatically created and updated by the bot.

## Development

### Project Structure

```
slack-pr-rewards/
├── app.py              # Main Slack bot application
├── rewards.py          # Reward tracking logic
├── config.py           # Configuration and emoji point values
├── requirements.txt    # Python dependencies
├── .env.example        # Example environment variables
└── README.md          # This file
```

### Running in Production

For production deployment, consider:

1. **Persistent Storage**: The current system uses a JSON file. For scale, consider a database (PostgreSQL, Redis, etc.)
2. **Process Management**: Use a process manager like systemd, supervisor, or PM2
3. **Monitoring**: Add logging and error tracking (e.g., Sentry)
4. **Hosting**: Deploy to a cloud provider (Heroku, AWS, Google Cloud, etc.)

## License

See [LICENSE](LICENSE) file for details.
