"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, Flame, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@stunet/ui";

interface LiveAlert {
  id: string;
  title: string;
  severity: "INFO" | "WARNING" | "URGENT";
  body?: string;
  createdAt: string;
}

interface ExamItem {
  id: string;
  subject: string;
  code: string;
  date: string;
  time: string;
  examType: string;
}

export default function CampusSidebarRight() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampusData() {
      try {
        const res = await fetch("/api/campus/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts((data.alerts ?? []).slice(0, 2));
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchCampusData();
  }, []);

  // Upcoming CIA exams preview data
  const upcomingExams: ExamItem[] = [
    {
      id: "cia2-dbms",
      subject: "Database Management Systems",
      code: "CS401",
      date: "Nov 14, 2026",
      time: "10:00 AM",
      examType: "CIA-2",
    },
    {
      id: "cia2-algo",
      subject: "Design & Analysis of Algorithms",
      code: "CS402",
      date: "Nov 17, 2026",
      time: "02:00 PM",
      examType: "CIA-2",
    },
  ];

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-76 shrink-0 sticky top-20 self-start">
      {/* Live Campus Alerts */}
      <Card className="border-indigo-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3.5 border-b border-indigo-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Live Campus Alerts</span>
            </div>
            <Link
              href="/campus"
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <span>View all</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-3 space-y-2.5">
          {loading ? (
            <div className="py-4 text-center text-xs text-slate-400">Checking campus updates…</div>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <Badge
                    variant={alert.severity === "URGENT" ? "urgent" : "default"}
                    className="text-[10px] py-0 px-2 font-bold"
                  >
                    {alert.severity}
                  </Badge>
                  <span className="text-[10px] text-slate-400">Campus Official</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">{alert.title}</p>
                {alert.body && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{alert.body}</p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-center">
              <p className="text-xs font-medium text-emerald-800">All clear</p>
              <p className="text-[10px] text-emerald-600">No active alerts reported today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Exams Countdown */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader className="p-3.5 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>Exam Timetable</span>
            </CardTitle>
            <Link
              href="/campus"
              className="text-[10px] font-semibold text-indigo-600 hover:underline"
            >
              Full schedule
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0 space-y-2">
          {upcomingExams.map((exam) => (
            <div key={exam.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  {exam.examType}
                </span>
                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {exam.date}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate">{exam.subject}</p>
              <p className="text-[10px] text-slate-500">
                Course: {exam.code} · {exam.time}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trending Campus Clubs */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader className="p-3.5 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>Campus Chapters</span>
            </CardTitle>
            <Link
              href="/clubs"
              className="text-[10px] font-semibold text-indigo-600 hover:underline"
            >
              Explore all
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                💻
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">ACM Student Chapter</p>
                <p className="text-[10px] text-slate-500">Tech & Algorithms</p>
              </div>
            </div>
            <Link
              href="/clubs"
              className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
            >
              Join
            </Link>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                🤖
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Robotics & AI Club</p>
                <p className="text-[10px] text-slate-500">Hardware & ML</p>
              </div>
            </div>
            <Link
              href="/clubs"
              className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
            >
              Join
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="px-2 text-[11px] text-slate-400 space-y-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <Link href="/campus" className="hover:text-slate-600">
            Academic Calendar
          </Link>
          <span>·</span>
          <Link href="/clubs" className="hover:text-slate-600">
            Societies
          </Link>
          <span>·</span>
          <Link href="/marketplace" className="hover:text-slate-600">
            Classifieds
          </Link>
        </div>
        <p className="text-[10px] text-slate-400">StuNet · NIAT Campus Platform © 2026</p>
      </div>
    </aside>
  );
}
