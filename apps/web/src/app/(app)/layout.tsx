/**
 * (app) layout — Instagram Web responsive shell.
 * Desktop: Left vertical rail (244px/72px), No top header, No bottom bar.
 * Mobile/Tablet: Centered max-w-[680px], Sticky top header, Fixed 5-tab bottom bar.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch student avatar and username if available
  const identity = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { username: true, avatarUrl: true, displayName: true },
  });

  const userData = {
    id: session.user.id,
    name: identity?.displayName ?? session.user.name ?? "Student",
    username: identity?.username ?? "student",
    email: session.user.email ?? null,
    avatarUrl: identity?.avatarUrl ?? null,
  };

  return (
    <Providers session={session}>
      <AppShell user={userData}>{children}</AppShell>
    </Providers>
  );
}
