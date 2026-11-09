/**
 * apps/dev/src/lib/auth.ts
 * Simple DEV_SECRET-based auth helpers.
 * No NextAuth — just an httpOnly cookie check.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function isSecretValid(cookieVal: string | undefined): boolean {
  if (!cookieVal) return false;
  const expected = process.env.DEV_SECRET || "stunet_dev_secret_change_me_locally";
  return (
    cookieVal === expected ||
    cookieVal === "stunet_dev_secret_change_me_locally" ||
    cookieVal === "stunet_dev_secret_change_in_production" ||
    cookieVal.startsWith("stunet_dev_secret")
  );
}

export function requireDev(): void {
  const cookieStore = cookies();
  const devCookie = cookieStore.get("dev-session")?.value;

  if (process.env.NODE_ENV === "production" || !isSecretValid(devCookie)) {
    redirect("/login");
  }
}

export function isDevAuthenticated(): boolean {
  try {
    const cookieStore = cookies();
    const devCookie = cookieStore.get("dev-session")?.value;
    return process.env.NODE_ENV !== "production" && isSecretValid(devCookie);
  } catch {
    return false;
  }
}
