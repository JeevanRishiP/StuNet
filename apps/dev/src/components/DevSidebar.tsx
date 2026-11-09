"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Terminal,
  LayoutDashboard,
  Users,
  School,
  UsersRound,
  FileText,
  Trophy,
  ShoppingBag,
  Link2,
  Flag,
  Bell,
  AlertTriangle,
  Calendar,
  BookOpen,
  Trash2,
  ClipboardList,
  Zap,
  // Dev Tools
  UserCog,
  ShieldCheck,
  Leaf,
  TestTube,
  Activity,
  Database,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const ENTITY_NAV = [
  { href: "/users", label: "Users", icon: Users },
  { href: "/campus-admins", label: "Campus Admins", icon: ShieldCheck },
  { href: "/campuses", label: "Campuses", icon: School },
  { href: "/batches", label: "Batches", icon: Calendar },
  { href: "/subjects", label: "Semester Subjects", icon: BookOpen },
  { href: "/clubs", label: "Clubs", icon: UsersRound },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/connections", label: "Connections", icon: Link2 },
  { href: "/reports", label: "Reports", icon: Flag },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/schedules", label: "Schedules", icon: Calendar },
  { href: "/deletions", label: "Deletions", icon: Trash2 },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/bulk-actions", label: "Bulk Actions", icon: Zap },
];

const TOOLS_NAV = [
  { href: "/impersonate", label: "Role Impersonator", icon: UserCog },
  { href: "/permissions", label: "Permission Tester", icon: ShieldCheck },
  { href: "/seeder", label: "Data Seeder", icon: Leaf },
  { href: "/api-sandbox", label: "API Sandbox", icon: TestTube },
  { href: "/queues", label: "Queue Inspector", icon: Activity },
  { href: "/raw-query", label: "Raw DB Query", icon: Database },
];

function NavSection({
  title,
  items,
  pathname,
  defaultOpen = true,
}: {
  title: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href as `/${string}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${active ? "text-amber-400" : "text-slate-500"}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DevSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <aside className="w-60 bg-slate-950 border-r border-slate-800/60 flex flex-col min-h-screen shrink-0">
      {/* Brand */}
      <div className="p-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              <span>StuNet</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-400 border border-amber-500/30">
                DEV
              </span>
            </h1>
            <p className="text-[10px] text-slate-500">Developer Console</p>
          </div>
        </div>
      </div>

      {/* Dashboard Home */}
      <div className="px-3 pt-3">
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all mb-2 ${
            pathname === "/"
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <LayoutDashboard
            className={`h-3.5 w-3.5 shrink-0 ${pathname === "/" ? "text-amber-400" : "text-slate-500"}`}
          />
          <span>Dev Dashboard</span>
        </Link>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-thin">
        <NavSection title="Entities" items={ENTITY_NAV} pathname={pathname} defaultOpen={true} />
        <NavSection title="Dev Tools" items={TOOLS_NAV} pathname={pathname} defaultOpen={true} />
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-slate-800/60">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
