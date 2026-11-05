"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
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
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Zap,
  RefreshCw,
} from "lucide-react";

interface Stats {
  users: {
    total: number;
    student: number;
    clubManager: number;
    campusManager: number;
    superAdmin: number;
    pendingVerification: number;
    banned: number;
  };
  campuses: { total: number };
  clubs: { total: number; active: number };
  posts: { total: number };
  achievements: { total: number; pending: number };
  reports: { total: number; open: number };
  marketplace: { total: number; active: number };
  notifications: { total: number; unread: number };
  alerts: { active: number };
  connections: { total: number; pending: number };
  recentAudit: {
    id: string;
    action: string;
    targetType: string;
    createdAt: string;
    admin: { displayName: string | null; username: string | null };
  }[];
}

const TILES = [
  { key: "users", label: "Total Users", icon: Users, href: "/users", color: "amber" },
  { key: "campuses", label: "Campuses", icon: School, href: "/campuses", color: "blue" },
  { key: "clubs", label: "Active Clubs", icon: UsersRound, href: "/clubs", color: "purple" },
  { key: "posts", label: "Total Posts", icon: FileText, href: "/posts", color: "emerald" },
  {
    key: "achievements",
    label: "Achievements",
    icon: Trophy,
    href: "/achievements",
    color: "yellow",
  },
  { key: "reports", label: "Open Reports", icon: Flag, href: "/reports", color: "rose" },
  {
    key: "marketplace",
    label: "Active Listings",
    icon: ShoppingBag,
    href: "/marketplace",
    color: "cyan",
  },
  { key: "connections", label: "Connections", icon: Link2, href: "/connections", color: "violet" },
];

function getStatValue(stats: Stats, key: string): number {
  switch (key) {
    case "users":
      return stats.users.total;
    case "campuses":
      return stats.campuses.total;
    case "clubs":
      return stats.clubs.active;
    case "posts":
      return stats.posts.total;
    case "achievements":
      return stats.achievements.total;
    case "reports":
      return stats.reports.open;
    case "marketplace":
      return stats.marketplace.active;
    case "connections":
      return stats.connections.total;
    default:
      return 0;
  }
}

function getSubValue(stats: Stats, key: string): string | null {
  switch (key) {
    case "users":
      return `${stats.users.pendingVerification} pending verification`;
    case "clubs":
      return `${stats.clubs.total} total`;
    case "achievements":
      return `${stats.achievements.pending} pending review`;
    case "reports":
      return `${stats.reports.total} total reports`;
    case "marketplace":
      return `${stats.marketplace.total} total`;
    case "connections":
      return `${stats.connections.pending} pending`;
    default:
      return null;
  }
}

const COLOR_MAP: Record<string, string> = {
  amber: "from-amber-500 to-orange-500 shadow-amber-500/20",
  blue: "from-blue-500 to-indigo-500 shadow-blue-500/20",
  purple: "from-purple-500 to-pink-500 shadow-purple-500/20",
  emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/20",
  yellow: "from-yellow-500 to-amber-500 shadow-yellow-500/20",
  rose: "from-rose-500 to-pink-500 shadow-rose-500/20",
  cyan: "from-cyan-500 to-blue-500 shadow-cyan-500/20",
  violet: "from-violet-500 to-purple-500 shadow-violet-500/20",
};

const QUICK_TOOLS = [
  {
    href: "/impersonate",
    label: "Role Impersonator",
    desc: "Log in as any user role",
    icon: Users,
  },
  {
    href: "/permissions",
    label: "Permission Tester",
    desc: "Test RBAC access matrix",
    icon: CheckCircle2,
  },
  { href: "/seeder", label: "Data Seeder", desc: "Seed test data presets", icon: Database },
  { href: "/queues", label: "Queue Inspector", desc: "Live BullMQ job status", icon: Activity },
  { href: "/api-sandbox", label: "API Sandbox", desc: "Test any API route", icon: Zap },
  { href: "/raw-query", label: "Raw DB Query", desc: "Run SQL read queries", icon: ClipboardList },
];

export default function DevHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/stats");
      if (!res.ok) throw new Error(await res.text());
      setStats((await res.json()) as Stats);
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dev Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Full-access developer console — local only
          </p>
        </div>
        <button
          onClick={() => void loadStats()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-400">
          <XCircle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Could not load stats</p>
            <p className="text-rose-500/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const value = stats ? getStatValue(stats, tile.key) : null;
          const sub = stats ? getSubValue(stats, tile.key) : null;
          return (
            <Link
              key={tile.key}
              href={tile.href as `/${string}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors group"
            >
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr ${COLOR_MAP[tile.color] ?? "from-amber-500 to-orange-500"} text-white shadow-md mb-3`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="text-slate-700">—</span>
                ) : (
                  (value?.toLocaleString() ?? "—")
                )}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{tile.label}</p>
              {sub && !loading && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
            </Link>
          );
        })}
      </div>

      {/* Alert + User Role Summary row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Active Alerts</h3>
            </div>
            <p className="text-3xl font-bold text-amber-400">{stats.alerts.active}</p>
            <Link
              href="/alerts"
              className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
            >
              Manage alerts →
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Notifications</h3>
            </div>
            <p className="text-3xl font-bold text-indigo-400">{stats.notifications.unread}</p>
            <p className="text-xs text-slate-500">unread / {stats.notifications.total} total</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Users by Role</h3>
            </div>
            {[
              { label: "Students", val: stats.users.student, c: "text-slate-300" },
              { label: "Club Managers", val: stats.users.clubManager, c: "text-purple-400" },
              { label: "Campus Managers", val: stats.users.campusManager, c: "text-amber-400" },
              { label: "Super Admins", val: stats.users.superAdmin, c: "text-rose-400" },
              { label: "Banned", val: stats.users.banned, c: "text-rose-600" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-bold ${r.c}`}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tools */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Developer Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href as `/${string}`}
                className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5 hover:border-amber-500/30 hover:bg-slate-800/60 transition-all group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                    {tool.label}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Audit */}
      {stats && stats.recentAudit.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Recent Audit Events</h2>
            <Link
              href="/audit"
              className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {stats.recentAudit.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center justify-between px-4 py-2.5 text-xs ${
                  i < stats.recentAudit.length - 1 ? "border-b border-slate-800/60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-semibold">{log.action}</span>
                  <span className="text-slate-500">on</span>
                  <span className="text-slate-400">{log.targetType}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>{log.admin?.displayName ?? log.admin?.username ?? "System"}</span>
                  <span>·</span>
                  <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-700 text-center">
        Last refreshed: {lastRefresh.toLocaleTimeString()} · DEV CONSOLE · localhost:3012
      </p>
    </div>
  );
}
