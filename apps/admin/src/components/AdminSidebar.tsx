"use client";

/**
 * AdminSidebar — left navigation for the admin portal.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Route } from "next";

const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/directory", label: "Directory", icon: "👥" },
  { href: "/onboarding", label: "Onboarding", icon: "✅" },
  // Phases 5–7 routes added when pages are created:
  { href: "/reports", label: "Reports", icon: "🚨" },
  { href: "/achievements", label: "Achievements", icon: "🏆" },
  { href: "/alerts", label: "Campus Alerts", icon: "📢" },
  { href: "/audit", label: "Audit Log", icon: "📋" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="font-bold text-white text-lg">StuNet</p>
        <p className="text-xs text-slate-500 mt-0.5">Admin Portal</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <span>🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
