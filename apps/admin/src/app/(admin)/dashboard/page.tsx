import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import Link from "next/link";
import type { Route } from "next";
import {
  Users,
  UserCheck,
  AlertTriangle,
  Bell,
  Trophy,
  Calendar,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await requireAdmin();

  // Scoped queries according to role
  const campusFilter = session.managedCampusId ? { campusId: session.managedCampusId } : {};

  const [studentCount, pendingCount, reportCount, alertCount] = await Promise.all([
    adminDb.userIdentity.count({ where: campusFilter }).catch(() => 0),
    adminDb.userIdentity
      .count({ where: { ...campusFilter, verificationStatus: "PENDING" } })
      .catch(() => 0),
    adminDb.report.count({ where: { status: "OPEN" } }).catch(() => 0),
    adminDb.campusLiveAlert.count({ where: { ...campusFilter, isActive: true } }).catch(() => 0),
  ]);

  const metrics = [
    {
      label: "Total Students",
      value: studentCount,
      change: "Active campus community",
      icon: Users,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      href: "/directory",
    },
    {
      label: "Pending Onboarding",
      value: pendingCount,
      change: "Needs identity review",
      icon: UserCheck,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      href: "/onboarding",
    },
    {
      label: "Open Reports",
      value: reportCount,
      change: "Trust & Safety queue",
      icon: AlertTriangle,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      href: "/reports",
    },
    {
      label: "Live Campus Alerts",
      value: alertCount,
      change: "Active announcements",
      icon: Bell,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      href: "/alerts",
    },
  ];

  const quickNav = [
    {
      label: "Student Directory",
      href: "/directory",
      description: "Search, inspect, and manage verified student identities and campus scopes.",
      icon: Users,
    },
    {
      label: "Institutional Onboarding",
      href: "/onboarding",
      description: "Verify mismatched domain signups or pending university verifications.",
      icon: UserCheck,
    },
    {
      label: "Reports & Safety Queue",
      href: "/reports",
      description: "Triage flagged posts, reported marketplace listings, and abusive behavior.",
      icon: AlertTriangle,
    },
    {
      label: "Achievement Verifications",
      href: "/achievements",
      description: "Review student hackathons, open-source trophies, and competitive ranks.",
      icon: Trophy,
    },
    {
      label: "Campus Emergency Alerts",
      href: "/alerts",
      description: "Broadcast urgent alerts, exams notices, and security advisories.",
      icon: Bell,
    },
    {
      label: "CIA & Exam Timetables",
      href: "/schedules",
      description: "Publish CIA-1, CIA-2, and semester examination time slots.",
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Institutional Dashboard
            </h1>
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-mono font-semibold text-indigo-300">
              {session.role}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Authenticated administrator session · Role-isolated DB boundary active
            {session.managedCampusId && (
              <span className="text-slate-300"> · Campus ID: {session.managedCampusId}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={"/audit" as Route}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span>Audit Logs</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.label}
              href={m.href as Route}
              className={`rounded-2xl border ${m.borderColor} ${m.bgColor} p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {m.label}
                </span>
                <Icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-white tracking-tight">{m.value}</p>
              <p className="mt-1 text-xs text-slate-400">{m.change}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Access Modules */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Management Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className="group rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 transition-all hover:border-slate-700 hover:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
