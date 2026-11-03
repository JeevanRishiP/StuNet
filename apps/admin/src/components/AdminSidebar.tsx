"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Route } from "next";
import {
  Shield,
  LayoutDashboard,
  School,
  Users,
  UserCheck,
  AlertTriangle,
  Trophy,
  Bell,
  Calendar,
  ClipboardList,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campuses", label: "Campus Infrastructure", icon: School },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/onboarding", label: "Onboarding Queue", icon: UserCheck },
  { href: "/reports", label: "Reports & Safety", icon: AlertTriangle },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/alerts", label: "Campus Alerts", icon: Bell },
  { href: "/schedules", label: "Exam Schedules", icon: Calendar },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col min-h-screen shrink-0">
      {/* Brand & Badge */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
              <span>StuNet</span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-indigo-400 border border-indigo-500/30">
                ADMIN
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Institutional Console</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-slate-800/80">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
