import * as fs from "fs";
import { RewardStore } from "../storage/store";

// Mock the fs module
jest.mock("fs");

const mockedFs = fs as jest.Mocked<typeof fs>;

describe("RewardStore", () => {
  let store: RewardStore;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock: no existing file
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.mkdirSync.mockImplementation(() => undefined);

    store = new RewardStore();
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

      const storeWithData = new RewardStore();
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
    it("should record reaction event", () => {
      const event = {
        userId: "user1",
        username: "testuser",
        emoji: "white_check_mark",
        messageUserId: "user2",
        messageTs: "123.456",
        channelId: "channel1",
        timestamp: new Date().toISOString(),
      };

      store.recordReaction(event);

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });
});
