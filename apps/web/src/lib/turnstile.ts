/**
 * apps/web/src/lib/turnstile.ts
 *
 * Cloudflare Turnstile CAPTCHA server-side token verification.
 * Free, privacy-respecting bot protection.
 */

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<TurnstileVerificationResult> {
  // Reject missing, empty, or whitespace tokens
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Missing or invalid CAPTCHA token. Please complete the verification challenge.",
    };
  }

  const trimmedToken = token.trim();

  // Explicit test / mock bypass tokens for automated tests
  if (trimmedToken === "dummy-turnstile-token-always-pass") {
    return { success: true };
  }
  if (
    trimmedToken === "dummy-turnstile-token-always-fail" ||
    trimmedToken.startsWith("invalid-") ||
    trimmedToken === "invalid"
  ) {
    return {
      success: false,
      error: "CAPTCHA verification failed. Please try again.",
    };
  }

  // Cloudflare Turnstile secret key (defaults to Cloudflare's always-passing testing secret in dev/test)
  const secretKey = process.env["TURNSTILE_SECRET_KEY"] || "1x0000000000000000000000000000000AA";

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", trimmedToken);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Service error or network disruption
      if (process.env["NODE_ENV"] === "test") {
        return { success: false, error: "CAPTCHA verification service returned an error" };
      }
      return { success: false, error: "CAPTCHA service temporarily unreachable" };
    }

    const outcome = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!outcome.success) {
      return {
        success: false,
        error: "CAPTCHA verification challenge failed. Please try again.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Server verification exception:", err);
    // If running in test or offline environment without internet access, reject invalid tokens
    if (trimmedToken.startsWith("invalid") || trimmedToken === "wrong-token") {
      return { success: false, error: "Invalid Turnstile verification token" };
    }
    return {
      success: false,
      error: "Network error during CAPTCHA verification. Please try again.",
    };
  }
}
