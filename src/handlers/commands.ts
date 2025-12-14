import { App } from "@slack/bolt";
import { rewardService } from "../services/rewards";

/**
 * Register slash command handlers with the Slack app
 */
export function registerCommandHandlers(app: App): void {
  // /rewards - Show leaderboard or personal stats
  app.command("/rewards", async ({ command, ack, respond }) => {
    await ack();

    const args = command.text.trim().toLowerCase();

    if (args === "me" || args === "stats") {
      // Show personal stats
      const message = rewardService.formatUserStatsMessage(command.user_id);
      await respond({
        response_type: "ephemeral",
        text: message,
      });
    } else if (args === "help") {
      // Show help with tracked emojis list
      const trackedEmojis = rewardService
        .getTrackedEmojis()
        .map((e) => `:${e}:`)
        .join(" ");

      await respond({
        response_type: "ephemeral",
        text: [
          "*🎯 PR Rewards Bot Help*",
          "",
          "Earn points by reacting to messages with tracked emojis!",
          "",
          "*Points:*",
          "• *Giving* a tracked reaction: 1 point",
          "• *Receiving* a tracked reaction: 2 points",
          "",
          `*Tracked Emojis:* ${trackedEmojis}`,
          "",
          "*Commands:*",
          "• `/rewards` - Show the leaderboard",
          "• `/rewards me` - Show your personal stats",
          "• `/rewards help` - Show this help message",
        ].join("\n"),
      });
    } else {
      // Show leaderboard (default)
      const limit = parseInt(args) || 10;
      const message = rewardService.formatLeaderboardMessage(Math.min(limit, 25));
      await respond({
        response_type: "in_channel",
        text: message,
      });
    }
  });
}
