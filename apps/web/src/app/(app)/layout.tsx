/**
 * (app) group layout — authenticated 3-column shell.
 * Guards all student-facing routes. Redirects to /login if no session.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppNav from "@/components/AppNav";
import Providers from "@/components/Providers";
import StudentSidebarLeft from "@/components/StudentSidebarLeft";
import CampusSidebarRight from "@/components/CampusSidebarRight";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <Providers session={session}>
      <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col">
        <AppNav user={session.user} />
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center gap-6">
            {/* Left Column: Student Identity & Quick Links */}
            <StudentSidebarLeft user={session.user} />

            {/* Center Column: Dynamic Content Feed / Hub */}
            <main className="flex-1 max-w-2xl min-w-0">{children}</main>

            {/* Right Column: Campus Alerts, CIA Exams, Trending Clubs */}
            <CampusSidebarRight />
          </div>
        </div>
      </div>
    </Providers>
  );
}
