"use client";

import { useEffect, useState } from "react";

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

const SEVERITY_STYLES: Record<AlertSeverity, { banner: string; badge: string }> = {
  INFO: {
    banner: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  WARNING: {
    banner: "bg-yellow-50 border-yellow-300",
    badge: "bg-yellow-100 text-yellow-800",
  },
  CRITICAL: {
    banner: "bg-red-50 border-red-300",
    badge: "bg-red-100 text-red-800",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampusPage() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [cia, setCia] = useState<CiaEntry[]>([]);
  const [ia, setIa] = useState<IaEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading campus info…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Campus</h1>

      {/* ── Live Alerts ── */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">🔔 Live Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const styles = SEVERITY_STYLES[alert.severity];
              return (
                <div key={alert.id} className={`border rounded-lg p-4 ${styles.banner}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${styles.badge}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-semibold text-gray-900">{alert.title}</span>
                      </div>
                      <p className="text-sm text-gray-700">{alert.body}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {formatDate(alert.createdAt)}
                    </span>
                  </div>
                  {alert.expiresAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {formatDateTime(alert.expiresAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CIA Schedule ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📋 Upcoming CIA Schedule</h2>
        {cia.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming CIA entries.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Component</th>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Venue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cia.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.subject}</td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded">
                        {entry.component}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(entry.scheduledAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.venue ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── IA Exams ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📝 Upcoming IA Exams</h2>
        {ia.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming IA exams.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Venue</th>
                  <th className="px-4 py-3 text-left">Syllabus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ia.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{exam.subject}</td>
                    <td className="px-4 py-3">
                      <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded">
                        {exam.examType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(exam.scheduledAt)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {exam.durationMins ? `${exam.durationMins} min` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{exam.venue ?? "—"}</td>
                    <td className="px-4 py-3">
                      {exam.syllabusUrl ? (
                        <a
                          href={exam.syllabusUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline text-xs"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Calendar Events ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📅 Campus Calendar</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming events.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{ev.title}</p>
                    {ev.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{ev.description}</p>
                    )}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 capitalize">
                    {ev.eventType}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(ev.eventDate)}
                  {ev.endDate && ev.endDate !== ev.eventDate ? ` → ${formatDate(ev.endDate)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
