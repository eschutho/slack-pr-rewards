import * as fs from "fs";
import * as path from "path";
import { StorageData, UserReward, ReactionEvent } from "../types";

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
    return { users: {}, reactionHistory: [] };
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
    // Keep only last 1000 reactions to prevent file bloat
    if (this.data.reactionHistory.length > 1000) {
      this.data.reactionHistory = this.data.reactionHistory.slice(-1000);
    }
    this.save();
  }

  getLeaderboard(limit: number = 10): UserReward[] {
    return this.getAllUsers()
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  }
}

// Singleton instance
export const store = new RewardStore();
