"""Main Slack bot application for emoji rewards system."""

import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from rewards import RewardTracker
from config import (
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET,
    SLACK_APP_TOKEN,
    EMOJI_POINTS,
    DEFAULT_EMOJI_POINTS,
)

# Initialize the Slack app
app = App(
    token=SLACK_BOT_TOKEN,
    signing_secret=SLACK_SIGNING_SECRET
)

# Initialize the reward tracker
tracker = RewardTracker()


@app.event("reaction_added")
def handle_reaction_added(event, say, client):
    """Handle when a reaction is added to a message.
    
    Awards points to the user who authored the message.
    """
    try:
        # Get the message that was reacted to
        reaction = event["reaction"]
        user_who_reacted = event["user"]
        item = event["item"]
        
        # Only process message reactions (not file reactions, etc.)
        if item["type"] != "message":
            return
        
        channel = item["channel"]
        message_ts = item["ts"]
        
        # Get the original message to find who authored it
        result = client.conversations_history(
            channel=channel,
            inclusive=True,
            oldest=message_ts,
            limit=1
        )
        
        if result["ok"] and result["messages"]:
            message = result["messages"][0]
            message_author = message.get("user")
            
            # Don't award points if someone reacts to their own message
            if message_author and message_author != user_who_reacted:
                points = tracker.add_points(message_author, reaction)
                total_points = tracker.get_user_points(message_author)
                
                # Optional: Send a notification (commented out to avoid spam)
                # say(
                #     channel=channel,
                #     thread_ts=message_ts,
                #     text=f"<@{message_author}> earned {points} points from :{reaction}:! Total: {total_points}"
                # )
                
    except Exception as e:
        print(f"Error handling reaction_added: {e}")


@app.event("reaction_removed")
def handle_reaction_removed(event, client):
    """Handle when a reaction is removed from a message.
    
    Removes points from the user who authored the message.
    """
    try:
        # Get the message that had a reaction removed
        reaction = event["reaction"]
        item = event["item"]
        
        # Only process message reactions
        if item["type"] != "message":
            return
        
        channel = item["channel"]
        message_ts = item["ts"]
        
        # Get the original message to find who authored it
        result = client.conversations_history(
            channel=channel,
            inclusive=True,
            oldest=message_ts,
            limit=1
        )
        
        if result["ok"] and result["messages"]:
            message = result["messages"][0]
            message_author = message.get("user")
            
            if message_author:
                tracker.remove_points(message_author, reaction)
                
    except Exception as e:
        print(f"Error handling reaction_removed: {e}")


@app.command("/rewards")
def handle_rewards_command(ack, command, say, client):
    """Handle the /rewards slash command to view user rewards.
    
    Usage:
        /rewards - Show your own points
        /rewards @user - Show points for a specific user
        /rewards leaderboard - Show top 10 users
    """
    ack()
    
    try:
        text = command.get("text", "").strip()
        user_id = command["user_id"]
        
        if text.lower() == "leaderboard":
            # Show leaderboard
            leaderboard = tracker.get_leaderboard(limit=10)
            
            if not leaderboard:
                say("No rewards have been earned yet!")
                return
            
            # Build leaderboard message
            lines = ["*🏆 Rewards Leaderboard 🏆*\n"]
            medals = ["🥇", "🥈", "🥉"]
            
            for idx, (uid, points) in enumerate(leaderboard, 1):
                medal = medals[idx - 1] if idx <= 3 else f"{idx}."
                lines.append(f"{medal} <@{uid}>: *{points}* points")
            
            say("\n".join(lines))
            
        elif text.startswith("<@") and text.endswith(">"):
            # Show points for mentioned user
            mentioned_user = text.strip("<@>").split("|")[0]
            points = tracker.get_user_points(mentioned_user)
            say(f"<@{mentioned_user}> has *{points}* points")
            
        else:
            # Show points for the user who ran the command
            points = tracker.get_user_points(user_id)
            say(f"You have *{points}* points")
            
    except Exception as e:
        print(f"Error handling /rewards command: {e}")
        say("Sorry, there was an error processing your request.")


@app.command("/rewards-help")
def handle_rewards_help_command(ack, say):
    """Handle the /rewards-help command to show emoji points."""
    ack()
    
    try:
        lines = ["*Emoji Rewards System* 🎁\n"]
        lines.append("Earn points when people react to your messages with emojis!\n")
        lines.append("*Emoji Point Values:*")
        
        # Sort emojis by point value
        sorted_emojis = sorted(EMOJI_POINTS.items(), key=lambda x: x[1], reverse=True)
        
        for emoji, points in sorted_emojis:
            lines.append(f":{emoji}: = {points} point{'s' if points != 1 else ''}")
        
        lines.append(f"\nAll other emojis = {DEFAULT_EMOJI_POINTS} point")
        lines.append("\n*Commands:*")
        lines.append("`/rewards` - Show your points")
        lines.append("`/rewards @user` - Show points for a user")
        lines.append("`/rewards leaderboard` - Show top 10 users")
        
        say("\n".join(lines))
        
    except Exception as e:
        print(f"Error handling /rewards-help command: {e}")
        say("Sorry, there was an error showing the help information.")


@app.event("app_mention")
def handle_app_mention(event, say):
    """Handle when the bot is mentioned."""
    say("Hi! Use `/rewards` to check your points or `/rewards-help` for more information!")


def main():
    """Start the Slack bot."""
    if not SLACK_BOT_TOKEN or not SLACK_APP_TOKEN:
        print("Error: SLACK_BOT_TOKEN and SLACK_APP_TOKEN must be set in environment variables")
        print("Please create a .env file based on .env.example")
        return
    
    # Start the app using Socket Mode
    handler = SocketModeHandler(app, SLACK_APP_TOKEN)
    print("⚡️ Slack Rewards Bot is running!")
    handler.start()


if __name__ == "__main__":
    main()
