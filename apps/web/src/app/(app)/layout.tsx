/**
 * (app) group layout — authenticated shell.
 * Guards all student-facing routes. Redirects to /login if no session.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppNav from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav user={session.user} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
