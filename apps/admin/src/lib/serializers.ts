/**
 * apps/admin/src/lib/serializers.ts
 *
 * THE ONE definition of admin-safe user fields.
 * RULE: Never return more fields than this from any admin list/detail/export endpoint.
 * RULE: No PII (no email, no phone, no private details) without explicit user approval.
 * RULE: Never inline or redefine per-route — import from here everywhere.
 *
 * If you need to add a field here, stop and ask the user first (Plan Rule #2).
 */

/** Subset of UserIdentity that admin_service_role CAN read */
export interface AdminSafeUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  role: string;
  verificationStatus: string;
  campusId: string | null;
  campusName: string | null;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
}

/**
 * Serialize a UserIdentity row (from adminDb query) into the admin-safe shape.
 * Takes a partial object because different queries select different subsets.
 */
export function serializeAdminUser(user: {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  role: string;
  verificationStatus: string;
  campusId: string | null;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
  campus?: { name: string } | null;
}): AdminSafeUser {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    headline: user.headline,
    role: user.role,
    verificationStatus: user.verificationStatus,
    campusId: user.campusId,
    campusName: user.campus?.name ?? null,
    isActive: user.isActive,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  };
}
