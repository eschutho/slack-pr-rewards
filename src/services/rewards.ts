import { store } from "../storage/store";
import {
  RewardConfig,
  LeaderboardEntry,
  ReactionEvent,
  LeaderboardPeriod,
} from "../types";

/**
 * Default reward configuration
 * Only tracked emojis will earn points - all others are ignored
 */
const DEFAULT_CONFIG: RewardConfig = {
  pointsForGiving: 1,
  pointsForReceiving: 2,
  // Only these emojis are tracked for rewards
  trackedEmojis: [
    "white_check_mark", // ✅ white checkbox
    "speech_balloon", // 💬 comment bubble
    "exclamation", // ❗ exclamation mark
    "question", // ❓ question mark
  ],
};

export class RewardService {
  private config: RewardConfig;

  constructor(config: Partial<RewardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if an emoji is tracked for rewards
   */
  isTrackedEmoji(emoji: string): boolean {
    return this.config.trackedEmojis.includes(emoji.toLowerCase());
  }

  /**
   * Get the list of tracked emojis
   */
  getTrackedEmojis(): string[] {
    return this.config.trackedEmojis;
  }

  /**
   * Calculate points for giving a reaction (only if tracked)
   */
  calculateGivingPoints(emoji: string): number {
    return this.isTrackedEmoji(emoji) ? this.config.pointsForGiving : 0;
  }

  /**
   * Calculate points for receiving a reaction (only if tracked)
   */
  calculateReceivingPoints(emoji: string): number {
    return this.isTrackedEmoji(emoji) ? this.config.pointsForReceiving : 0;
  }

  /**
   * Count star emojis in a message for bonus points (max 5)
   * Looks for :star: emoji syntax in message text
   */
  countStarsInMessage(messageText: string): number {
    // Match :star: emoji in Slack message format
    const starMatches = messageText.match(/:star:/g);
    const count = starMatches ? starMatches.length : 0;
    // Cap at 5 stars max
    return Math.min(count, 5);
  }

  /**
   * Calculate reactor points based on star count
   * 0 or 1 star = 1 point, 2+ stars = star count points
   */
  calculateReactorPoints(starCount: number): number {
    return starCount >= 2 ? starCount : 1;
  }

  /**
   * Process a reaction_added event
   * Awards points to both the giver and receiver (only for tracked emojis)
   * Star bonus: reactor gets points based on stars (1 for 0-1 stars, 2-5 for 2-5 stars)
   * Author always gets base 2 points (no star bonus)
   */
  processReactionAdded(
    giverId: string,
    giverUsername: string,
    receiverId: string,
    receiverUsername: string,
    emoji: string,
    channelId: string,
    messageTs: string,
    starCount: number = 0
  ): { giverPoints: number; receiverPoints: number; tracked: boolean } {
    // Ignore non-tracked emojis
    if (!this.isTrackedEmoji(emoji)) {
      return { giverPoints: 0, receiverPoints: 0, tracked: false };
    }

    // Don't award points for self-reactions
    if (giverId === receiverId) {
      return { giverPoints: 0, receiverPoints: 0, tracked: true };
    }

    // Check if user already earned points for this message (1 point per message max)
    if (store.hasClaimedReaction(giverId, channelId, messageTs)) {
      return { giverPoints: 0, receiverPoints: 0, tracked: true };
    }

    // Calculate points: reactor gets star-based points, author gets base points only
    const giverPoints = this.calculateReactorPoints(starCount);
    const receiverPoints = this.config.pointsForReceiving; // Always base 2 pts

    // Mark as claimed before awarding points
    store.claimReaction(giverId, channelId, messageTs);

    // Update stores
    store.addPointsForGiving(giverId, giverUsername, giverPoints);
    store.addPointsForReceiving(receiverId, receiverUsername, receiverPoints);

    // Record the event with points for time-based leaderboards
    const event: ReactionEvent = {
      userId: giverId,
      username: giverUsername,
      emoji,
      messageUserId: receiverId,
      messageUserName: receiverUsername,
      messageTs,
      channelId,
      timestamp: new Date().toISOString(),
      giverPoints,
      receiverPoints,
    };
    store.recordReaction(event);

    return { giverPoints, receiverPoints, tracked: true };
  }

  /**
   * Get the leaderboard with rankings
   */
  getLeaderboard(limit: number = 10): LeaderboardEntry[] {
    const users = store.getLeaderboard(limit);
    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      username: user.username,
      totalPoints: user.totalPoints,
      reactionsGiven: user.reactionsGiven,
      reactionsReceived: user.reactionsReceived,
    }));
  }

  /**
   * Get stats for a specific user
   */
  getUserStats(userId: string) {
    return store.getUser(userId);
  }

  /**
   * Format leaderboard for Slack display
   */
  formatLeaderboardMessage(limit: number = 10): string {
    const leaderboard = this.getLeaderboard(limit);

    if (leaderboard.length === 0) {
      return "No points earned yet! Start reacting to messages to earn points. 🎯";
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = leaderboard.map((entry) => {
      const medal = medals[entry.rank - 1] || `${entry.rank}.`;
      return `${medal} <@${entry.userId}> - *${entry.totalPoints} pts* (${entry.reactionsGiven} given, ${entry.reactionsReceived} received)`;
    });

    return `*🏆 Points Leaderboard*\n\n${lines.join("\n")}`;
  }

  /**
   * Format user stats for Slack display
   */
  formatUserStatsMessage(userId: string): string {
    const stats = this.getUserStats(userId);

    if (!stats) {
      return "You haven't earned any points yet! React to messages to start earning points. 🎯";
    }

    return [
      `*📊 Your Stats*`,
      ``,
      `• *Total Points:* ${stats.totalPoints}`,
      `• *Reactions Given:* ${stats.reactionsGiven}`,
      `• *Reactions Received:* ${stats.reactionsReceived}`,
      `• *Last Activity:* ${new Date(stats.lastActivity).toLocaleDateString()}`,
    ].join("\n");
  }

  /**
   * Get period display name
   */
  private getPeriodDisplayName(period: LeaderboardPeriod): string {
    switch (period) {
      case "30days":
        return "Last 30 Days";
      case "mtd":
        return "Month to Date";
      case "6months":
        return "Last 6 Months";
      case "year":
        return "Year to Date";
      case "all":
        return "All Time";
      default:
        return "Last 30 Days";
    }
  }

  /**
   * Format time-based leaderboard for Slack display
   */
  formatLeaderboardByPeriod(period: LeaderboardPeriod, limit: number = 10): string {
    const leaderboard = store.getLeaderboardByPeriod(period, limit);
    const periodName = this.getPeriodDisplayName(period);

    if (leaderboard.length === 0) {
      return `No points earned in ${periodName.toLowerCase()}! Start reacting to messages to earn points. 🎯`;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = leaderboard.map((entry, index) => {
      const medal = medals[index] || `${index + 1}.`;
      return `${medal} <@${entry.userId}> - *${entry.points} pts*`;
    });

    return `*🏆 Leaderboard: ${periodName}*\n\n${lines.join("\n")}`;
  }
}

// Singleton instance
export const rewardService = new RewardService();
