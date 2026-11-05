/**
 * (dev) group layout — authenticated dev shell with sidebar.
 */
import { requireDev } from "@/lib/auth";
import DevSidebar from "@/components/DevSidebar";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  requireDev();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <DevSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
