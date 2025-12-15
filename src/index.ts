import { App, LogLevel } from "@slack/bolt";
import * as dotenv from "dotenv";
import { registerReactionHandlers } from "./handlers/reactions";
import { registerCommandHandlers } from "./handlers/commands";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "SLACK_APP_TOKEN"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize the Slack app with Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
});

// Register handlers
registerReactionHandlers(app);
registerCommandHandlers(app);

// Start the app
async function start() {
  const port = parseInt(process.env.PORT || "3000", 10);

  await app.start(port);
  console.log(`⚡️ Slack PR Points bot is running!`);
  console.log(`   Mode: Socket Mode`);
  console.log(`   Log Level: ${process.env.LOG_LEVEL || "INFO"}`);
}

start().catch((error) => {
  console.error("Failed to start the app:", error);
  process.exit(1);
});
