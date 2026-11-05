"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export default function AdminProviders({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}): React.JSX.Element {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
