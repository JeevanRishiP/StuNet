/**
 * apps/admin/src/types/next-auth.d.ts
 * Augments NextAuth Session/JWT to include admin-specific fields.
 */
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      campusId?: string;
      managedCampusId?: string;
      managedCampusName?: string;
    };
  }

  interface User {
    role: string;
    campusId?: string;
    managedCampusId?: string;
    managedCampusName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    campusId?: string;
    managedCampusId?: string;
    managedCampusName?: string;
    isAdmin?: boolean;
  }
}
