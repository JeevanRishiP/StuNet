"use client";

/**
 * AppNav — top navigation bar for authenticated student portal.
 * Kept intentionally minimal for Phase 3. Expanded in Phase 5 (clubs, etc.)
 */
import Link from "next/link";
import { signOut } from "next-auth/react";

interface NavUser {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  image?: string | null;
}

export default function AppNav({ user }: { user: NavUser }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="font-bold text-blue-600 text-lg">
          StuNet
        </Link>

        {/* Primary links */}
        <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-blue-600">
            Feed
          </Link>
          <Link href="/network" className="hover:text-blue-600">
            Network
          </Link>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <Link
            href={`/u/${user.username ?? user.id}`}
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            {user.name ?? "Profile"}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
