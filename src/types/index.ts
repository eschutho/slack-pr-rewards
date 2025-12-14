/**
 * Core types for the Slack PR Rewards application
 */

export interface UserReward {
  userId: string;
  username: string;
  totalPoints: number;
  reactionsGiven: number;
  reactionsReceived: number;
  lastActivity: string;
}

export interface ReactionEvent {
  userId: string;
  username: string;
  emoji: string;
  messageUserId: string;
  messageTs: string;
  channelId: string;
  timestamp: string;
}

export interface RewardConfig {
  /** Points earned for giving a tracked reaction */
  pointsForGiving: number;
  /** Points earned for receiving a tracked reaction */
  pointsForReceiving: number;
  /** Only these emojis are tracked for rewards (all others ignored) */
  trackedEmojis: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  reactionsGiven: number;
  reactionsReceived: number;
}

export interface StorageData {
  users: Record<string, UserReward>;
  reactionHistory: ReactionEvent[];
}
