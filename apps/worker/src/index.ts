import pino from "pino";

const logger = pino({
  name: "stunet-worker",
  level: process.env["LOG_LEVEL"] ?? "info",
});

logger.info("StuNet worker starting — Phase 0 placeholder");
logger.info("BullMQ queues will be wired in Phase 8 (External Sync Workers)");

// Keep the process alive for now
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down worker");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received — shutting down worker");
  process.exit(0);
});

