/**
 * apps/web/src/__tests__/turnstile-captcha.test.ts
 *
 * Tests server-side enforcement of Cloudflare Turnstile CAPTCHA.
 * Verifies that requests with missing or invalid Turnstile tokens are rejected server-side.
 */

import { describe, it, expect, vi } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { POST as setPasswordRoute } from "@/app/api/auth/set-password/route";
import { NextRequest } from "next/server";

// Mock NextAuth auth() session to simulate an authenticated user
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: {
      id: "test-user-id-123",
      username: "testuser",
      role: "STUDENT",
      isGuest: false,
    },
  })),
}));

describe("Cloudflare Turnstile Server Verification", () => {
  it("rejects missing, undefined, or empty tokens directly", async () => {
    const missingUndefined = await verifyTurnstileToken(undefined);
    expect(missingUndefined.success).toBe(false);
    expect(missingUndefined.error).toMatch(/Missing or invalid CAPTCHA token/i);

    const missingNull = await verifyTurnstileToken(null);
    expect(missingNull.success).toBe(false);

    const emptyStr = await verifyTurnstileToken("   ");
    expect(emptyStr.success).toBe(false);
  });

  it("rejects invalid or forged verification tokens", async () => {
    const invalidResult = await verifyTurnstileToken("dummy-turnstile-token-always-fail");
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toMatch(/CAPTCHA verification failed/i);

    const randomForgedToken = await verifyTurnstileToken("invalid-token-12345");
    expect(randomForgedToken.success).toBe(false);
  });

  it("accepts valid verification tokens", async () => {
    const validResult = await verifyTurnstileToken("dummy-turnstile-token-always-pass");
    expect(validResult.success).toBe(true);
    expect(validResult.error).toBeUndefined();
  });

  it("server-side route /api/auth/set-password rejects requests missing Turnstile token", async () => {
    const req = new NextRequest("http://localhost:3010/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "ValidSecurePassword123!",
        confirmPassword: "ValidSecurePassword123!",
        // turnstileToken omitted
      }),
    });

    const res = await setPasswordRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/CAPTCHA verification required/i);
  });

  it("server-side route /api/auth/set-password rejects requests with invalid Turnstile token", async () => {
    const req = new NextRequest("http://localhost:3010/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "ValidSecurePassword123!",
        confirmPassword: "ValidSecurePassword123!",
        turnstileToken: "dummy-turnstile-token-always-fail",
      }),
    });

    const res = await setPasswordRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/CAPTCHA verification required/i);
  });
});
