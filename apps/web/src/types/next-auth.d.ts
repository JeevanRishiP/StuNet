/**
 * apps/web/src/types/next-auth.d.ts
 * Augments NextAuth Session/JWT with student portal fields.
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
      verificationStatus: string;
    };
  }

  interface User {
    role: string;
    campusId?: string;
    verificationStatus: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    campusId?: string;
    verificationStatus?: string;
  }
}
