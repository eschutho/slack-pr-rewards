import * as fs from "fs";
import * as path from "path";
import { StorageData, UserReward, ReactionEvent, LeaderboardPeriod } from "../types";

const DATA_FILE = path.join(process.cwd(), "data", "rewards.json");

/**
 * Simple JSON file-based storage for reward data
 * Can be swapped for SQLite or other database later
 */
export class RewardStore {
  private data: StorageData;

  constructor() {
    this.data = this.load();
  }

  private load(): StorageData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error("Error loading data file, starting fresh:", error);
    }
    return { users: {}, reactionHistory: [], claimedReactions: {} };
  }

  private save(): void {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("Error saving data file:", error);
    }
  }

  getUser(userId: string): UserReward | undefined {
    return this.data.users[userId];
  }

  getAllUsers(): UserReward[] {
    return Object.values(this.data.users);
  }

  upsertUser(userId: string, username: string): UserReward {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        userId,
        username,
        totalPoints: 0,
        reactionsGiven: 0,
        reactionsReceived: 0,
        lastActivity: new Date().toISOString(),
      };
    } else {
      // Update username in case it changed
      this.data.users[userId].username = username;
    }
    return this.data.users[userId];
  }

  addPointsForGiving(userId: string, username: string, points: number): UserReward {
    const user = this.upsertUser(userId, username);
    user.totalPoints += points;
    user.reactionsGiven += 1;
    user.lastActivity = new Date().toISOString();
    this.save();
    return user;
  }

  addPointsForReceiving(userId: string, username: string, points: number): UserReward {
    const user = this.upsertUser(userId, username);
    user.totalPoints += points;
    user.reactionsReceived += 1;
    user.lastActivity = new Date().toISOString();
    this.save();
    return user;
  }

  recordReaction(event: ReactionEvent): void {
    this.data.reactionHistory.push(event);
    // Keep only last 10000 reactions for time-based leaderboards
    if (this.data.reactionHistory.length > 10000) {
      this.data.reactionHistory = this.data.reactionHistory.slice(-10000);
    }
    this.save();
  }

  getLeaderboard(limit: number = 10): UserReward[] {
    return this.getAllUsers()
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  }

  /**
   * Get the start date for a given period
   */
  private getStartDateForPeriod(period: LeaderboardPeriod): Date | null {
    const now = new Date();

    switch (period) {
      case "30days":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "mtd":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case "6months":
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case "year":
        return new Date(now.getFullYear(), 0, 1);
      case "all":
        return null;
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get leaderboard for a specific time period
   * Calculates points from reaction history within the date range
   */
  getLeaderboardByPeriod(
    period: LeaderboardPeriod,
    limit: number = 10
  ): { userId: string; username: string; points: number; reactions: number }[] {
    const startDate = this.getStartDateForPeriod(period);

    // Filter reactions by date
    const filteredReactions = startDate
      ? this.data.reactionHistory.filter(
          (r) => new Date(r.timestamp) >= startDate
        )
      : this.data.reactionHistory;

    // Aggregate points per user (both giver and receiver points)
    const userPoints: Record<
      string,
      { username: string; points: number; reactions: number }
    > = {};

    for (const reaction of filteredReactions) {
      // Add giver points
      if (reaction.giverPoints > 0) {
        if (!userPoints[reaction.userId]) {
          userPoints[reaction.userId] = {
            username: reaction.username,
            points: 0,
            reactions: 0,
          };
        }
        userPoints[reaction.userId].points += reaction.giverPoints;
        userPoints[reaction.userId].reactions += 1;
      }

      // Add receiver points
      if (reaction.receiverPoints > 0) {
        if (!userPoints[reaction.messageUserId]) {
          userPoints[reaction.messageUserId] = {
            username: reaction.messageUserName || reaction.messageUserId,
            points: 0,
            reactions: 0,
          };
        }
        userPoints[reaction.messageUserId].points += reaction.receiverPoints;
      }
    }

    // Sort and limit
    return Object.entries(userPoints)
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        points: data.points,
        reactions: data.reactions,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  /**
   * Check if a user has already claimed points for reacting to a message
   */
  hasClaimedReaction(giverId: string, channelId: string, messageTs: string): boolean {
    const key = `${giverId}:${channelId}:${messageTs}`;
    return !!this.data.claimedReactions[key];
  }

  /**
   * Mark that a user has claimed points for reacting to a message
   */
  claimReaction(giverId: string, channelId: string, messageTs: string): void {
    const key = `${giverId}:${channelId}:${messageTs}`;
    this.data.claimedReactions[key] = true;
    this.save();
  }
}

// Singleton instance
export const store = new RewardStore();
