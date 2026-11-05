/**
 * apps/dev/src/lib/auth.ts
 * Simple DEV_SECRET-based auth helpers.
 * No NextAuth — just an httpOnly cookie check.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function requireDev(): void {
  const cookieStore = cookies();
  const devCookie = cookieStore.get("dev-session")?.value;
  const expected = process.env.DEV_SECRET;

  if (process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  if (!expected || devCookie !== expected) {
    redirect("/login");
  }
}

export function isDevAuthenticated(): boolean {
  try {
    const cookieStore = cookies();
    const devCookie = cookieStore.get("dev-session")?.value;
    const expected = process.env.DEV_SECRET;
    return !!expected && devCookie === expected && process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}
