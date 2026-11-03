"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Bell,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@stunet/ui";

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

interface LiveAlert {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  expiresAt: string | null;
  createdAt: string;
}

interface CiaEntry {
  id: string;
  subject: string;
  component: string;
  scheduledAt: string;
  venue: string | null;
  notes: string | null;
}

interface IaEntry {
  id: string;
  subject: string;
  examType: string;
  scheduledAt: string;
  durationMins: number | null;
  venue: string | null;
  syllabusUrl: string | null;
  notes: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  eventType: string;
}

export default function CampusPage() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [cia, setCia] = useState<CiaEntry[]>([]);
  const [ia, setIa] = useState<IaEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALERTS" | "CIA" | "IA" | "CALENDAR">("ALERTS");

  useEffect(() => {
    async function load() {
      try {
        const [alertsRes, scheduleRes, calendarRes] = await Promise.all([
          fetch("/api/campus/alerts"),
          fetch("/api/campus/schedule"),
          fetch("/api/campus/calendar"),
        ]);

        if (alertsRes.ok) {
          const d = await alertsRes.json();
          setAlerts(d.alerts ?? []);
        }
        if (scheduleRes.ok) {
          const d = await scheduleRes.json();
          setCia(d.cia ?? []);
          setIa(d.ia ?? []);
        }
        if (calendarRes.ok) {
          const d = await calendarRes.json();
          setEvents(d.events ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function formatDateTime(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-2xl bg-slate-200 shimmer" />
        <div className="h-64 rounded-2xl bg-slate-100 shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-md">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
            <Building2 className="h-3.5 w-3.5" />
            <span>Campus Academic Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Alerts & Exam Timetable
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed">
            Direct notices from college administration, Continuous Internal Assessment (CIA)
            schedules, IA exams, and academic calendar dates.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200/90 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("ALERTS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "ALERTS"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Live Alerts ({alerts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("CIA")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "CIA"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>CIA Schedule ({cia.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("IA")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "IA"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>IA Exams ({ia.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("CALENDAR")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "CALENDAR"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Academic Calendar ({events.length})</span>
        </button>
      </div>

      {/* ── 1. Live Alerts Tab ── */}
      {activeTab === "ALERTS" && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900">All clear on campus</h3>
              <p className="text-xs text-slate-500 mt-1">
                No active urgent alerts or notices issued at this time.
              </p>
            </Card>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.severity === "CRITICAL";
              const isWarning = alert.severity === "WARNING";

              return (
                <Card
                  key={alert.id}
                  className={`overflow-hidden border-slate-200/90 shadow-sm ${
                    isCritical
                      ? "border-rose-300 bg-rose-50/30"
                      : isWarning
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-indigo-200 bg-white"
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isCritical ? "urgent" : isWarning ? "pending" : "default"}
                          className="text-[10px]"
                        >
                          {alert.severity}
                        </Badge>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          {alert.title}
                        </CardTitle>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1">
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {alert.body}
                    </p>

                    {alert.expiresAt && (
                      <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Active until {formatDateTime(alert.expiresAt)}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── 2. CIA Schedule Tab ── */}
      {activeTab === "CIA" && (
        <Card className="border-slate-200/90 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-slate-50/60 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Continuous Internal Assessment (CIA) Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {cia.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No CIA exam timetables posted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Subject</th>
                      <th className="px-4 py-3 text-left font-bold">Component</th>
                      <th className="px-4 py-3 text-left font-bold">Date & Time</th>
                      <th className="px-4 py-3 text-left font-bold">Venue</th>
                      <th className="px-4 py-3 text-left font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cia.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{c.subject}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {c.component}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {formatDateTime(c.scheduledAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{c.venue ?? "Campus Hall"}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 3. IA Exams Tab ── */}
      {activeTab === "IA" && (
        <Card className="border-slate-200/90 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-slate-50/60 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Internal Assessment & Semester Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ia.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No IA exam timetables posted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Subject</th>
                      <th className="px-4 py-3 text-left font-bold">Type</th>
                      <th className="px-4 py-3 text-left font-bold">Scheduled At</th>
                      <th className="px-4 py-3 text-left font-bold">Duration</th>
                      <th className="px-4 py-3 text-left font-bold">Venue</th>
                      <th className="px-4 py-3 text-left font-bold">Syllabus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ia.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.subject}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            {item.examType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {formatDateTime(item.scheduledAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.durationMins ? `${item.durationMins} mins` : "90 mins"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.venue ?? "Main Block"}</td>
                        <td className="px-4 py-3">
                          {item.syllabusUrl ? (
                            <a
                              href={item.syllabusUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                            >
                              <span>View</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">Regular</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 4. Calendar Tab ── */}
      {activeTab === "CALENDAR" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.length === 0 ? (
            <Card className="col-span-2 p-10 text-center text-xs text-slate-500">
              No campus events scheduled in the calendar.
            </Card>
          ) : (
            events.map((ev) => (
              <Card
                key={ev.id}
                className="border-slate-200/90 shadow-sm p-4 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{ev.title}</h4>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                      {ev.eventType}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{ev.description}</p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-indigo-600">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(ev.eventDate)}
                    {ev.endDate && ev.endDate !== ev.eventDate
                      ? ` → ${formatDate(ev.endDate)}`
                      : ""}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
