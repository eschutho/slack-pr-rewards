"""Configuration for the Slack emoji rewards system."""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Slack API credentials
SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN")
SLACK_SIGNING_SECRET = os.environ.get("SLACK_SIGNING_SECRET")
SLACK_APP_TOKEN = os.environ.get("SLACK_APP_TOKEN")

# Server configuration
PORT = int(os.environ.get("PORT", 3000))

# Emoji to points mapping
# Users earn these points when their messages receive these emoji reactions
EMOJI_POINTS = {
    "+1": 1,
    "thumbsup": 1,
    "heart": 2,
    "fire": 3,
    "100": 5,
    "trophy": 10,
    "star": 2,
    "clap": 1,
    "raised_hands": 2,
    "tada": 5,
}

# Default points for any emoji not in the mapping
DEFAULT_EMOJI_POINTS = 1
