import { App, ReactionAddedEvent } from "@slack/bolt";
import { pointsService } from "../services/points";

/**
 * Register reaction event handlers with the Slack app
 */
export function registerReactionHandlers(app: App): void {
  // Handle reaction_added events
  app.event("reaction_added", async ({ event, client, logger }) => {
    try {
      const reactionEvent = event as ReactionAddedEvent;
      const { user: giverId, reaction: emoji, item } = reactionEvent;

      // Only handle reactions on messages
      if (item.type !== "message") {
        return;
      }

      const { channel, ts: messageTs } = item;

      // Fetch the original message to get the author
      const result = await client.conversations.history({
        channel,
        latest: messageTs,
        inclusive: true,
        limit: 1,
      });

      const message = result.messages?.[0];
      if (!message || !message.user) {
        logger.warn("Could not find message or message author");
        return;
      }

      const receiverId = message.user;

      // Count star emojis in the message for bonus points (max 5)
      const messageText = message.text || "";
      const starCount = pointsService.countStarsInMessage(messageText);

      // Get user info for both giver and receiver
      const [giverInfo, receiverInfo] = await Promise.all([
        client.users.info({ user: giverId }),
        client.users.info({ user: receiverId }),
      ]);

      const giverUsername = giverInfo.user?.name || giverId;
      const receiverUsername = receiverInfo.user?.name || receiverId;

      // Process the points (only for tracked emojis)
      const { giverPoints, receiverPoints, tracked } = pointsService.processReactionAdded(
        giverId,
        giverUsername,
        receiverId,
        receiverUsername,
        emoji,
        channel,
        messageTs,
        starCount
      );

      // Track message for PR review timing (only for tracked emojis)
      if (tracked) {
        // Track this message (first reaction starts the timer)
        pointsService.trackMessage(channel, messageTs, receiverId, receiverUsername);

        // If this is a white_check_mark, mark the message as reviewed
        if (pointsService.isReviewEmoji(emoji)) {
          pointsService.markAsReviewed(channel, messageTs);
          logger.info(`Message reviewed: ${receiverUsername}'s message in ${channel}`);
        }
      }

      // Only log if this was a tracked emoji
      if (tracked && (giverPoints > 0 || receiverPoints > 0)) {
        logger.info(
          `Points awarded: ${giverUsername} gave :${emoji}: to ${receiverUsername}. ` +
            `Giver +${giverPoints}pts, Receiver +${receiverPoints}pts`
        );
      }
    } catch (error) {
      logger.error("Error processing reaction_added event:", error);
    }
  });

  // Optional: Handle reaction_removed to subtract points
  app.event("reaction_removed", async ({ event, logger }) => {
    // For now, we don't subtract points when reactions are removed
    // This prevents gaming the system by adding/removing reactions
    logger.debug("Reaction removed (no points deducted):", event);
  });
}
