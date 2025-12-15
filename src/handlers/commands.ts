import { App } from "@slack/bolt";
import { rewardService } from "../services/rewards";
import { LeaderboardPeriod } from "../types";

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
          "• *Reactor:* 1 point (per message)",
          "• *Author:* 2 points (per message)",
          "",
          "*⭐ Star Bonus (reactor only):*",
          "Authors can add :star: to difficult PRs to reward reviewers more!",
          "• 0-1 stars: 1 point",
          "• 2 stars: 2 points",
          "• 3 stars: 3 points",
          "• 4 stars: 4 points",
          "• 5 stars: 5 points",
          "",
          `*Tracked Emojis:* ${trackedEmojis}`,
          "",
          "*Commands:*",
          "• `/rewards` - Show the all-time leaderboard",
          "• `/rewards me` - Show your personal stats",
          "• `/rewards help` - Show this help message",
          "• `/leaderboard [period]` - Time-based leaderboard",
          "",
          "*Leaderboard Periods:*",
          "• `30days` - Last 30 days (default)",
          "• `mtd` - Month to date",
          "• `6months` - Last 6 months",
          "• `year` - Year to date",
          "• `all` - All time",
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

  // /leaderboard - Show time-based leaderboard
  app.command("/leaderboard", async ({ command, ack, respond }) => {
    await ack();

    const args = command.text.trim().toLowerCase();

    // Parse period from args
    const validPeriods: LeaderboardPeriod[] = ["30days", "mtd", "6months", "year", "all"];
    let period: LeaderboardPeriod = "30days"; // default

    if (args === "help") {
      await respond({
        response_type: "ephemeral",
        text: [
          "*📊 Leaderboard Command Help*",
          "",
          "Show the leaderboard for different time periods:",
          "",
          "• `/leaderboard` - Last 30 days (default)",
          "• `/leaderboard 30days` - Last 30 days",
          "• `/leaderboard mtd` - Month to date",
          "• `/leaderboard 6months` - Last 6 months",
          "• `/leaderboard year` - Year to date",
          "• `/leaderboard all` - All time",
        ].join("\n"),
      });
      return;
    }

    if (validPeriods.includes(args as LeaderboardPeriod)) {
      period = args as LeaderboardPeriod;
    }

    const message = rewardService.formatLeaderboardByPeriod(period);
    await respond({
      response_type: "in_channel",
      text: message,
    });
  });
}
