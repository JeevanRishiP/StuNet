/**
 * apps/web/src/lib/serializers.ts
 *
 * The ONE definition of which fields are safe to return for each role.
 * NEVER redefine per-route — import from here everywhere.
 * Plan rule: "there is exactly one definition of 'safe user fields' in the
 * codebase, imported everywhere, never redefined per-route."
 */
import type { UserIdentity } from "@prisma/client";
import type { ContactVisibility } from "@prisma/client";
import { calculateAcademicYear, type AcademicYearInfo } from "@stunet/types";

/** Fields always safe to return (public profile skeleton) */
export interface PublicUserProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  headline: string | null;
  campusId: string | null;
  role: string;
  verificationStatus: string;
  joiningYear: number | null;
  academicYear: AcademicYearInfo | null;
  createdAt: Date;
}

/** Fields visible to accepted connections (or the user themselves) */
export interface ConnectedUserProfile extends PublicUserProfile {
  contactVisibility: ContactVisibility;
  // Personal contact returned only when visibility allows — see serializeForViewer
}

/** With optional personal contact (only when viewer is allowed) */
export interface UserProfileWithContact extends ConnectedUserProfile {
  whatsappNumber?: string | null;
  personalEmail?: string | null;
}

/** Serialize a UserIdentity for public (guest/logged-in) display */
export function serializePublicProfile(user: UserIdentity): PublicUserProfile {
  const joiningYear = user.joiningYear ?? null;
  const academicYear = calculateAcademicYear(joiningYear);

  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    headline: user.headline,
    campusId: user.campusId,
    role: user.role,
    verificationStatus: user.verificationStatus,
    joiningYear,
    academicYear,
    createdAt: user.createdAt,
  };
}

/**
 * Serialize for a specific viewer — applies contact visibility rules.
 * @param user         the profile owner's identity row
 * @param privateEmail the owner's email from user_private_details (null if admin caller)
 * @param privatePhone the owner's WhatsApp from user_private_details (null if admin caller)
 * @param viewerRelation  "self" | "connection" | "campus" | "public"
 */
export function serializeForViewer(
  user: UserIdentity,
  privateEmail: string | null,
  privatePhone: string | null,
  viewerRelation: "self" | "connection" | "campus" | "public",
): UserProfileWithContact {
  const base: ConnectedUserProfile = {
    ...serializePublicProfile(user),
    contactVisibility: user.contactVisibility,
  };

  // Determine if viewer can see contact fields
  const visibility = user.contactVisibility;
  let canSeeContact = false;

  if (viewerRelation === "self") canSeeContact = true;
  else if (visibility === "PUBLIC") canSeeContact = true;
  else if (visibility === "CONNECTIONS" && viewerRelation === "connection") canSeeContact = true;
  else if (
    visibility === "CAMPUS" &&
    (viewerRelation === "connection" || viewerRelation === "campus")
  )
    canSeeContact = true;
  // "ONLY_ME" → only self can see it

  return {
    ...base,
    ...(canSeeContact ? { whatsappNumber: privatePhone, personalEmail: privateEmail } : {}),
  };
}

/** Blocked user — return minimal stub so blocked users are invisible */
export interface BlockedUserStub {
  id: string;
  isBlocked: true;
}

export function blockedStub(id: string): BlockedUserStub {
  return { id, isBlocked: true };
}
