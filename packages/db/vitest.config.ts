import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Role isolation tests require a live DB — run separately from unit tests
    include: ["src/**/*.test.ts"],
    testTimeout: 15000,
  },
});
