/**
 * (admin) group layout — authenticated admin shell.
 * Sidebar navigation + main content area.
 */
import { requireAdmin } from "@/lib/rbac";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // All admin routes require auth — requireAdmin redirects to /login if no session
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
