import * as fs from "fs";
import { PointsStore } from "../storage/store";

// Mock the fs module
jest.mock("fs");

const mockedFs = fs as jest.Mocked<typeof fs>;

describe("PointsStore", () => {
  let store: PointsStore;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock: no existing file
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.mkdirSync.mockImplementation(() => undefined);

    store = new PointsStore();
  });

  describe("initialization", () => {
    it("should start with empty data when no file exists", () => {
      expect(store.getAllUsers()).toEqual([]);
      expect(store.getLeaderboard()).toEqual([]);
    });

    it("should load existing data from file", () => {
      const existingData = {
        users: {
          user1: {
            userId: "user1",
            username: "testuser",
            totalPoints: 10,
            reactionsGiven: 5,
            reactionsReceived: 3,
            lastActivity: "2024-01-01T00:00:00.000Z",
          },
        },
        reactionHistory: [],
        claimedReactions: {},
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingData));

      const storeWithData = new PointsStore();
      const users = storeWithData.getAllUsers();

      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe("user1");
      expect(users[0].totalPoints).toBe(10);
    });
  });

  describe("getUser", () => {
    it("should return undefined for non-existent user", () => {
      expect(store.getUser("nonexistent")).toBeUndefined();
    });
  });

  describe("upsertUser", () => {
    it("should create new user if not exists", () => {
      const user = store.upsertUser("user1", "testuser");

      expect(user.userId).toBe("user1");
      expect(user.username).toBe("testuser");
      expect(user.totalPoints).toBe(0);
      expect(user.reactionsGiven).toBe(0);
      expect(user.reactionsReceived).toBe(0);
    });

    it("should update username if user exists", () => {
      store.upsertUser("user1", "oldname");
      const user = store.upsertUser("user1", "newname");

      expect(user.username).toBe("newname");
    });
  });

  describe("addPointsForGiving", () => {
    it("should add points and increment reactionsGiven", () => {
      const user = store.addPointsForGiving("user1", "testuser", 3);

      expect(user.totalPoints).toBe(3);
      expect(user.reactionsGiven).toBe(1);
      expect(user.reactionsReceived).toBe(0);
    });

    it("should accumulate points across multiple calls", () => {
      store.addPointsForGiving("user1", "testuser", 2);
      const user = store.addPointsForGiving("user1", "testuser", 3);

      expect(user.totalPoints).toBe(5);
      expect(user.reactionsGiven).toBe(2);
    });

    it("should save to file after adding points", () => {
      store.addPointsForGiving("user1", "testuser", 1);

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe("addPointsForReceiving", () => {
    it("should add points and increment reactionsReceived", () => {
      const user = store.addPointsForReceiving("user1", "testuser", 2);

      expect(user.totalPoints).toBe(2);
      expect(user.reactionsReceived).toBe(1);
      expect(user.reactionsGiven).toBe(0);
    });
  });

  describe("hasClaimedReaction / claimReaction", () => {
    it("should return false for unclaimed reactions", () => {
      expect(store.hasClaimedReaction("user1", "channel1", "123.456")).toBe(
        false
      );
    });

    it("should return true after claiming a reaction", () => {
      store.claimReaction("user1", "channel1", "123.456");

      expect(store.hasClaimedReaction("user1", "channel1", "123.456")).toBe(
        true
      );
    });

    it("should differentiate between different user/channel/message combos", () => {
      store.claimReaction("user1", "channel1", "123.456");

      expect(store.hasClaimedReaction("user1", "channel1", "123.456")).toBe(
        true
      );
      expect(store.hasClaimedReaction("user2", "channel1", "123.456")).toBe(
        false
      );
      expect(store.hasClaimedReaction("user1", "channel2", "123.456")).toBe(
        false
      );
      expect(store.hasClaimedReaction("user1", "channel1", "789.012")).toBe(
        false
      );
    });
  });

  describe("getLeaderboard", () => {
    it("should return users sorted by points descending", () => {
      store.addPointsForGiving("user1", "low", 5);
      store.addPointsForGiving("user2", "high", 20);
      store.addPointsForGiving("user3", "mid", 10);

      const leaderboard = store.getLeaderboard();

      expect(leaderboard[0].username).toBe("high");
      expect(leaderboard[1].username).toBe("mid");
      expect(leaderboard[2].username).toBe("low");
    });

    it("should respect limit parameter", () => {
      store.addPointsForGiving("user1", "a", 1);
      store.addPointsForGiving("user2", "b", 2);
      store.addPointsForGiving("user3", "c", 3);

      const leaderboard = store.getLeaderboard(2);

      expect(leaderboard).toHaveLength(2);
    });
  });

  describe("recordReaction", () => {
    it("should record reaction event with points", () => {
      const event = {
        userId: "user1",
        username: "testuser",
        emoji: "white_check_mark",
        messageUserId: "user2",
        messageUserName: "author",
        messageTs: "123.456",
        channelId: "channel1",
        timestamp: new Date().toISOString(),
        giverPoints: 1,
        receiverPoints: 2,
      };

      store.recordReaction(event);

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe("getLeaderboardByPeriod", () => {
    it("should return empty array when no reactions", () => {
      const leaderboard = store.getLeaderboardByPeriod("30days");
      expect(leaderboard).toEqual([]);
    });

    it("should aggregate points from reactions within period", () => {
      // Record some reactions
      const now = new Date().toISOString();
      store.recordReaction({
        userId: "user1",
        username: "reactor1",
        emoji: "white_check_mark",
        messageUserId: "user2",
        messageUserName: "author1",
        messageTs: "123.456",
        channelId: "channel1",
        timestamp: now,
        giverPoints: 3,
        receiverPoints: 2,
      });

      store.recordReaction({
        userId: "user1",
        username: "reactor1",
        emoji: "exclamation",
        messageUserId: "user3",
        messageUserName: "author2",
        messageTs: "789.012",
        channelId: "channel1",
        timestamp: now,
        giverPoints: 1,
        receiverPoints: 2,
      });

      const leaderboard = store.getLeaderboardByPeriod("30days");

      // user1 gave 3+1=4 points, user2 received 2, user3 received 2
      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].userId).toBe("user1");
      expect(leaderboard[0].points).toBe(4);
    });

    it("should filter reactions by period", () => {
      // Record an old reaction (more than 30 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);

      store.recordReaction({
        userId: "user1",
        username: "old_reactor",
        emoji: "white_check_mark",
        messageUserId: "user2",
        messageUserName: "author",
        messageTs: "old.123",
        channelId: "channel1",
        timestamp: oldDate.toISOString(),
        giverPoints: 10,
        receiverPoints: 5,
      });

      // Record a recent reaction
      store.recordReaction({
        userId: "user3",
        username: "new_reactor",
        emoji: "white_check_mark",
        messageUserId: "user4",
        messageUserName: "new_author",
        messageTs: "new.456",
        channelId: "channel1",
        timestamp: new Date().toISOString(),
        giverPoints: 1,
        receiverPoints: 2,
      });

      const leaderboard = store.getLeaderboardByPeriod("30days");

      // Only recent reaction should be counted
      const user1Entry = leaderboard.find((e) => e.userId === "user1");
      const user3Entry = leaderboard.find((e) => e.userId === "user3");

      expect(user1Entry).toBeUndefined(); // Old reaction filtered out
      expect(user3Entry?.points).toBe(1);
    });

    it("should return all reactions for 'all' period", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      store.recordReaction({
        userId: "user1",
        username: "old_reactor",
        emoji: "white_check_mark",
        messageUserId: "user2",
        messageUserName: "author",
        messageTs: "old.123",
        channelId: "channel1",
        timestamp: oldDate.toISOString(),
        giverPoints: 5,
        receiverPoints: 2,
      });

      const leaderboard = store.getLeaderboardByPeriod("all");

      expect(leaderboard.find((e) => e.userId === "user1")?.points).toBe(5);
    });
  });
});
