import { RewardService } from "../services/rewards";

describe("RewardService", () => {
  let service: RewardService;

  beforeEach(() => {
    service = new RewardService();
  });

  describe("isTrackedEmoji", () => {
    it("should return true for tracked emojis", () => {
      expect(service.isTrackedEmoji("white_check_mark")).toBe(true);
      expect(service.isTrackedEmoji("speech_balloon")).toBe(true);
      expect(service.isTrackedEmoji("exclamation")).toBe(true);
      expect(service.isTrackedEmoji("question")).toBe(true);
    });

    it("should return false for non-tracked emojis", () => {
      expect(service.isTrackedEmoji("thumbsup")).toBe(false);
      expect(service.isTrackedEmoji("heart")).toBe(false);
      expect(service.isTrackedEmoji("rocket")).toBe(false);
      expect(service.isTrackedEmoji("star")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(service.isTrackedEmoji("WHITE_CHECK_MARK")).toBe(true);
      expect(service.isTrackedEmoji("Speech_Balloon")).toBe(true);
    });
  });

  describe("getTrackedEmojis", () => {
    it("should return all tracked emojis", () => {
      const emojis = service.getTrackedEmojis();
      expect(emojis).toContain("white_check_mark");
      expect(emojis).toContain("speech_balloon");
      expect(emojis).toContain("exclamation");
      expect(emojis).toContain("question");
      expect(emojis).toHaveLength(4);
    });
  });

  describe("countStarsInMessage", () => {
    it("should return 0 for messages without stars", () => {
      expect(service.countStarsInMessage("Hello world")).toBe(0);
      expect(service.countStarsInMessage("Please review this PR")).toBe(0);
    });

    it("should count :star: emojis in message", () => {
      expect(service.countStarsInMessage(":star: Please review")).toBe(1);
      expect(service.countStarsInMessage(":star::star: Important PR")).toBe(2);
      expect(service.countStarsInMessage(":star::star::star: Critical fix")).toBe(3);
    });

    it("should cap at 5 stars maximum", () => {
      expect(
        service.countStarsInMessage(":star::star::star::star::star: Max stars")
      ).toBe(5);
      expect(
        service.countStarsInMessage(
          ":star::star::star::star::star::star::star: Too many"
        )
      ).toBe(5);
    });

    it("should not count other star-like text", () => {
      expect(service.countStarsInMessage("star star star")).toBe(0);
      expect(service.countStarsInMessage("*starred* text")).toBe(0);
      expect(service.countStarsInMessage(":star2: different emoji")).toBe(0);
    });
  });

  describe("calculateReactorPoints", () => {
    it("should return 1 point for 0 stars", () => {
      expect(service.calculateReactorPoints(0)).toBe(1);
    });

    it("should return 1 point for 1 star", () => {
      expect(service.calculateReactorPoints(1)).toBe(1);
    });

    it("should return star count for 2+ stars", () => {
      expect(service.calculateReactorPoints(2)).toBe(2);
      expect(service.calculateReactorPoints(3)).toBe(3);
      expect(service.calculateReactorPoints(4)).toBe(4);
      expect(service.calculateReactorPoints(5)).toBe(5);
    });
  });

  describe("calculateGivingPoints", () => {
    it("should return 1 for tracked emojis", () => {
      expect(service.calculateGivingPoints("white_check_mark")).toBe(1);
      expect(service.calculateGivingPoints("speech_balloon")).toBe(1);
    });

    it("should return 0 for non-tracked emojis", () => {
      expect(service.calculateGivingPoints("thumbsup")).toBe(0);
      expect(service.calculateGivingPoints("heart")).toBe(0);
    });
  });

  describe("calculateReceivingPoints", () => {
    it("should return 2 for tracked emojis", () => {
      expect(service.calculateReceivingPoints("white_check_mark")).toBe(2);
      expect(service.calculateReceivingPoints("exclamation")).toBe(2);
    });

    it("should return 0 for non-tracked emojis", () => {
      expect(service.calculateReceivingPoints("rocket")).toBe(0);
      expect(service.calculateReceivingPoints("fire")).toBe(0);
    });
  });

  describe("formatLeaderboardMessage", () => {
    it("should show empty message when no users", () => {
      const message = service.formatLeaderboardMessage();
      expect(message).toContain("No points earned yet");
    });
  });

  describe("formatUserStatsMessage", () => {
    it("should show message for unknown user", () => {
      const message = service.formatUserStatsMessage("unknown-user");
      expect(message).toContain("haven't earned any points yet");
    });
  });
});
