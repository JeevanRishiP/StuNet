/**
 * apps/admin/src/lib/rbac.ts
 *
 * Role-based access control helpers for the Admin Portal.
 * Every API route explicitly declares which role(s) may call it
 * (plan Section 4 — no implicit default-allow).
 */
import { auth } from "./auth";
import { redirect } from "next/navigation";

export type AdminRole = "CAMPUS_MANAGER" | "SUPER_ADMIN";

export interface AdminSession {
  userId: string;
  role: AdminRole;
  campusId?: string;
  managedCampusId?: string;
}

/**
 * requireAdmin — call at the top of every admin Server Action or API route.
 * Throws a redirect to /login if the session is missing or the role is insufficient.
 */
export async function requireAdmin(
  allowedRoles: AdminRole[] = ["CAMPUS_MANAGER", "SUPER_ADMIN"],
): Promise<AdminSession> {
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;

  if (!user || !user["role"]) redirect("/login");

  const role = user["role"] as string;
  if (!allowedRoles.includes(role as AdminRole)) redirect("/unauthorized");

  return {
    userId: (user["id"] as string) ?? session?.user?.id ?? "",
    role: role as AdminRole,
    campusId: user["campusId"] as string | undefined,
    managedCampusId: user["managedCampusId"] as string | undefined,
  };
}

/**
 * assertCampusScope — CAMPUS_MANAGER can only act on their assigned campus.
 * SUPER_ADMIN can act on any campus.
 */
export function assertCampusScope(session: AdminSession, targetCampusId: string): void {
  if (session.role === "SUPER_ADMIN") return; // no restriction
  if (session.managedCampusId !== targetCampusId) {
    throw new Error("CAMPUS_SCOPE_VIOLATION");
  }
}
