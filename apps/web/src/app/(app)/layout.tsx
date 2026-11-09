/**
 * (app) layout — Instagram Web responsive shell.
 * Desktop: Left vertical rail (244px/72px), No top header, No bottom bar.
 * Mobile/Tablet: Centered max-w-[680px], Sticky top header, Fixed 5-tab bottom bar.
 */
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // If session exists, load identity
  let identity = null;
  if (session?.user?.id) {
    identity = await db.userIdentity.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        avatarUrl: true,
        displayName: true,
        role: true,
        campusId: true,
        campus: { select: { name: true } },
      },
    });
  }

  const isGuest = !session?.user?.id || (identity?.role ?? session?.user?.role) === "GUEST";

  const userData = {
    id: session?.user?.id ?? "cmw_guest_canonical",
    name: isGuest ? "Guest" : (identity?.displayName ?? session?.user?.name ?? "Student"),
    username: isGuest ? "guest" : (identity?.username ?? session?.user?.username ?? "student"),
    email: isGuest ? null : (session?.user?.email ?? null),
    avatarUrl: isGuest ? null : (identity?.avatarUrl ?? null),
    role: isGuest ? "GUEST" : (identity?.role ?? session?.user?.role ?? "STUDENT"),
    campusId: isGuest ? null : (identity?.campusId ?? null),
    campusName: isGuest ? null : (identity?.campus?.name ?? null),
    isGuest,
  };

  return (
    <Providers session={session}>
      <AppShell user={userData}>{children}</AppShell>
    </Providers>
  );
}
