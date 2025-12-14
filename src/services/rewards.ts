import { store } from "../storage/store";
import { RewardConfig, LeaderboardEntry, ReactionEvent } from "../types";

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
   * Process a reaction_added event
   * Awards points to both the giver and receiver (only for tracked emojis)
   */
  processReactionAdded(
    giverId: string,
    giverUsername: string,
    receiverId: string,
    receiverUsername: string,
    emoji: string,
    channelId: string,
    messageTs: string
  ): { giverPoints: number; receiverPoints: number; tracked: boolean } {
    // Ignore non-tracked emojis
    if (!this.isTrackedEmoji(emoji)) {
      return { giverPoints: 0, receiverPoints: 0, tracked: false };
    }

    // Don't award points for self-reactions
    if (giverId === receiverId) {
      return { giverPoints: 0, receiverPoints: 0, tracked: true };
    }

    const giverPoints = this.calculateGivingPoints(emoji);
    const receiverPoints = this.calculateReceivingPoints(emoji);

    // Update stores
    store.addPointsForGiving(giverId, giverUsername, giverPoints);
    store.addPointsForReceiving(receiverId, receiverUsername, receiverPoints);

    // Record the event
    const event: ReactionEvent = {
      userId: giverId,
      username: giverUsername,
      emoji,
      messageUserId: receiverId,
      messageTs,
      channelId,
      timestamp: new Date().toISOString(),
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
      return "No rewards earned yet! Start reacting to messages to earn points. 🎯";
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = leaderboard.map((entry) => {
      const medal = medals[entry.rank - 1] || `${entry.rank}.`;
      return `${medal} <@${entry.userId}> - *${entry.totalPoints} pts* (${entry.reactionsGiven} given, ${entry.reactionsReceived} received)`;
    });

    return `*🏆 PR Review Rewards Leaderboard*\n\n${lines.join("\n")}`;
  }

  /**
   * Format user stats for Slack display
   */
  formatUserStatsMessage(userId: string): string {
    const stats = this.getUserStats(userId);

    if (!stats) {
      return "You haven't earned any rewards yet! React to messages to start earning points. 🎯";
    }

    return [
      `*📊 Your Reward Stats*`,
      ``,
      `• *Total Points:* ${stats.totalPoints}`,
      `• *Reactions Given:* ${stats.reactionsGiven}`,
      `• *Reactions Received:* ${stats.reactionsReceived}`,
      `• *Last Activity:* ${new Date(stats.lastActivity).toLocaleDateString()}`,
    ].join("\n");
  }
}

// Singleton instance
export const rewardService = new RewardService();
