/**
 * Core types for the Slack PR Points application
 */

export interface UserPoints {
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
  messageUserName?: string;
  messageTs: string;
  channelId: string;
  timestamp: string;
  /** Points awarded to the reactor (giver) */
  giverPoints: number;
  /** Points awarded to the message author (receiver) */
  receiverPoints: number;
}

export type LeaderboardPeriod = "30days" | "mtd" | "6months" | "year" | "all";

export interface PointsConfig {
  /** Points earned for giving a tracked reaction */
  pointsForGiving: number;
  /** Points earned for receiving a tracked reaction */
  pointsForReceiving: number;
  /** Only these emojis are tracked for points (all others ignored) */
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

/**
 * Tracks a PR message for review timing
 */
export interface TrackedMessage {
  /** Unique key: channelId:messageTs */
  key: string;
  channelId: string;
  messageTs: string;
  /** User who posted the message */
  authorId: string;
  authorName: string;
  /** When the message was first seen (first reaction) */
  firstSeenAt: string;
  /** When the message received a white_check_mark (reviewed) */
  reviewedAt?: string;
  /** Whether this message has been reviewed */
  isReviewed: boolean;
}

export interface StorageData {
  users: Record<string, UserPoints>;
  reactionHistory: ReactionEvent[];
  /** Tracks which user has already earned points for reacting to a message */
  claimedReactions: Record<string, boolean>; // key: `${giverId}:${channelId}:${messageTs}`
  /** Tracks PR messages for review timing */
  trackedMessages: Record<string, TrackedMessage>; // key: `${channelId}:${messageTs}`
}
