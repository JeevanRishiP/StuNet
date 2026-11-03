"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  Download,
  ChevronRight,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Modal } from "@stunet/ui";

interface CiaEntry {
  id: string;
  ciaNumber: "CIA 1" | "CIA 2" | "CIA 3";
  subject: string;
  code: string;
  topic: string;
  submissionDate: string;
  status: "SUBMITTED" | "PENDING" | "EXTENDED";
}

interface IaEntry {
  id: string;
  iaNumber: "IA 1" | "IA 2";
  subject: string;
  code: string;
  date: string;
  time: string;
  syllabusTopics: string[];
  timetableUrl?: string;
  questionBankUrl?: string;
}

interface CampusCalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "EXAM" | "FEST" | "HOLIDAY" | "WORKSHOP";
  location: string;
}

export default function CampusPage() {
  const [activeIaTab, setActiveIaTab] = useState<"IA 1" | "IA 2">("IA 1");
  const [selectedResourceModal, setSelectedResourceModal] = useState<{
    title: string;
    type: "SYLLABUS" | "QUESTION_BANK" | "TIMETABLE";
    content: string[];
  } | null>(null);

  // Live Alerts & Countdown Ticker
  const liveNewsTicker = [
    {
      id: "news-1",
      title: "CIA 2 English - Submission Date Extended by 1 day",
      newDate: "Nov 15, 2026",
      urgent: true,
      countdown: "3 days left",
    },
    {
      id: "news-2",
      title: "IA 1 Question Bank & Timetable Officially Released",
      newDate: "Exam starts Nov 24",
      urgent: false,
      countdown: "12 days left",
    },
  ];

  // CIA Assessments (CIA 1, CIA 2, CIA 3)
  const ciaAssessments: CiaEntry[] = [
    {
      id: "cia-1-dbms",
      ciaNumber: "CIA 1",
      subject: "Database Management Systems",
      code: "CS401",
      topic: "Relational Schema Normalization (3NF & BCNF) Case Study",
      submissionDate: "Oct 18, 2026",
      status: "SUBMITTED",
    },
    {
      id: "cia-2-eng",
      ciaNumber: "CIA 2",
      subject: "Technical Communication & Ethics",
      code: "HS401",
      topic: "Research Whitepaper on AI Governance and Data Privacy",
      submissionDate: "Nov 15, 2026",
      status: "EXTENDED",
    },
    {
      id: "cia-2-algo",
      ciaNumber: "CIA 2",
      subject: "Design & Analysis of Algorithms",
      code: "CS402",
      topic: "Dynamic Programming & Dijkstra Optimizations Benchmarking",
      submissionDate: "Nov 18, 2026",
      status: "PENDING",
    },
    {
      id: "cia-3-os",
      ciaNumber: "CIA 3",
      subject: "Operating Systems Internals",
      code: "CS403",
      topic: "Custom Memory Allocator & Kernel Paging Simulation in C",
      submissionDate: "Dec 05, 2026",
      status: "PENDING",
    },
  ];

  // IA Assessments (IA 1, IA 2)
  const iaAssessments: IaEntry[] = [
    {
      id: "ia-1-dbms",
      iaNumber: "IA 1",
      subject: "Database Management Systems",
      code: "CS401",
      date: "Nov 24, 2026",
      time: "10:00 AM – 11:30 AM",
      syllabusTopics: [
        "Module 1: Relational Model, Constraints & SQL DDL/DML",
        "Module 2: ER Diagrams, Functional Dependencies & Normalization",
        "Module 3: Indexing Structures (B-Trees & Hash Indexing)",
      ],
    },
    {
      id: "ia-1-algo",
      iaNumber: "IA 1",
      subject: "Design & Analysis of Algorithms",
      code: "CS402",
      date: "Nov 26, 2026",
      time: "10:00 AM – 11:30 AM",
      syllabusTopics: [
        "Module 1: Asymptotic Notations & Divide-and-Conquer Recurrences",
        "Module 2: Greedy Strategy & Dynamic Programming (Knapsack, LCS)",
        "Module 3: Graph Algorithms (BFS, DFS, Minimum Spanning Trees)",
      ],
    },
    {
      id: "ia-2-os",
      iaNumber: "IA 2",
      subject: "Operating Systems Internals",
      code: "CS403",
      date: "Dec 18, 2026",
      time: "02:00 PM – 03:30 PM",
      syllabusTopics: [
        "Module 4: Process Synchronization, Mutexes & Semaphores",
        "Module 5: Deadlock Avoidance (Banker's Algorithm) & Prevention",
        "Module 6: Virtual Memory, Demand Paging & Page Replacement",
      ],
    },
  ];

  // Calendar of Events (Monthly/Weekly schedule)
  const calendarEvents: CampusCalendarEvent[] = [
    {
      id: "ev-1",
      title: "Arts Club Showcase & Cultural Exhibition",
      date: "Nov 12, 2026",
      type: "FEST",
      location: "Main Auditorium, S-VYASA",
    },
    {
      id: "ev-2",
      title: "IA 1 Internal Assessment Examinations",
      date: "Nov 24 – Nov 28, 2026",
      type: "EXAM",
      location: "Examination Halls A & B",
    },
    {
      id: "ev-3",
      title: "Winter Tech Fest & Hackathon 2026",
      date: "Dec 10 – Dec 12, 2026",
      type: "WORKSHOP",
      location: "Tech Innovation Hub",
    },
  ];

  // Calendar of Year (Academic Milestones)
  const academicYearCalendar = [
    { month: "August 2026", milestone: "Commencement of Odd Semester & Orientation" },
    { month: "October 2026", milestone: "CIA 1 Assessments & Mid-Term Review" },
    { month: "November 2026", milestone: "CIA 2 Assessments & IA 1 Examinations" },
    { month: "December 2026", milestone: "CIA 3 Submissions, IA 2 Exams & Winter Recess" },
    { month: "January 2027", milestone: "End Semester Practical & Theory University Finals" },
  ];

  const filteredIa = iaAssessments.filter((ia) => ia.iaNumber === activeIaTab);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── TOP FULL-WIDTH: LIVE NOTIFICATIONS & TODAY EVENTS TICKER ── */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full">
                  Live Campus Ticker
                </span>
                <span className="text-xs font-bold opacity-90">{liveNewsTicker[0]?.countdown}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold mt-0.5">
                {liveNewsTicker[0]?.title} • New Date: {liveNewsTicker[0]?.newDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[11px] font-medium bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              Updated by Academic Dean Office
            </span>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Campus Academic Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official CIA assessment submissions, IA examination schedules, question banks, and dual
            academic calendars.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>S-VYASA University Bengaluru</span>
        </div>
      </div>

      {/* ── DESKTOP 60/40 SPLIT (OR MOBILE VERTICAL STACK) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN (60% / cols-7): CIA 1-3 & IA 1-2 RESOURCE CARDS ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section: CIA (Continuous Internal Assessments) */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>CIA (Continuous Internal Assessments: CIA 1, 2, 3)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned topics, guidelines, and strict submission deadlines.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {ciaAssessments.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 transition-colors shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        {item.ciaNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {item.subject} ({item.code})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === "SUBMITTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "EXTENDED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-snug">
                    <span className="text-slate-400 font-bold">Topic: </span>
                    {item.topic}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Submission Date:{" "}
                      <strong className="text-slate-700">{item.submissionDate}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${item.ciaNumber} - ${item.subject}`,
                          type: "SYLLABUS",
                          content: [
                            `Topic: ${item.topic}`,
                            `Submission Due Date: ${item.submissionDate}`,
                            "Format: PDF report + GitHub repository link.",
                            "Plagiarism tolerance: strictly < 10% similarity index.",
                          ],
                        })
                      }
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Guidelines →
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section: IA (Internal Assessments: IA 1 & IA 2) */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span>IA (Internal Assessments 1 & 2)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Syllabus breakdown, official timetable, and verified question banks.
                </p>
              </div>

              {/* Segmented IA 1 / IA 2 Selector */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveIaTab("IA 1")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeIaTab === "IA 1"
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  IA 1 Exams
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIaTab("IA 2")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeIaTab === "IA 2"
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  IA 2 Exams
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {filteredIa.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {exam.subject} ({exam.code})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {exam.date} • {exam.time}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                      Written Exam (50 Marks)
                    </span>
                  </div>

                  {/* 3 Core IA Resources: Syllabus, Timetable, Question Bank */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* 1. Syllabus */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${exam.subject} — Syllabus (${exam.iaNumber})`,
                          type: "SYLLABUS",
                          content: exam.syllabusTopics,
                        })
                      }
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-colors group"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Resource 1
                      </span>
                      <span className="font-bold text-slate-800 group-hover:text-purple-600 flex items-center justify-between mt-0.5">
                        <span>Syllabus</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                    </button>

                    {/* 2. Timetable */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${exam.iaNumber} Official Examination Timetable`,
                          type: "TIMETABLE",
                          content: [
                            "Exam Center: Main University Academic Block",
                            "Session Morning: 10:00 AM – 11:30 AM",
                            "Admit Card & Student ID Card Mandatory",
                            "Reporting time: 20 minutes prior to paper distribution.",
                          ],
                        })
                      }
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-colors group"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Resource 2
                      </span>
                      <span className="font-bold text-slate-800 group-hover:text-purple-600 flex items-center justify-between mt-0.5">
                        <span>TimeTable</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                    </button>

                    {/* 3. Question Bank */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${exam.subject} — Verified Question Bank`,
                          type: "QUESTION_BANK",
                          content: [
                            "Section A: 10 Short Answer Questions (2 Marks each)",
                            "Section B: 4 Analytical Problem Scenarios (10 Marks each)",
                            "Includes previous 3 academic years solved question sets.",
                          ],
                        })
                      }
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-colors group"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Resource 3
                      </span>
                      <span className="font-bold text-slate-800 group-hover:text-purple-600 flex items-center justify-between mt-0.5">
                        <span>Question Bank</span>
                        <Download className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT STICKY COLUMN (40% / cols-5): DUAL CALENDARS ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Calendar Of Events */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>Calendar Of Events</span>
              </CardTitle>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Upcoming
              </span>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-slate-100">
              {calendarEvents.map((ev) => (
                <div key={ev.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{ev.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ev.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>{ev.date}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{ev.location}</span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Calendar Of Year */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                <span>Calendar Of Year (Academic Schedule 2026–2027)</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2 text-xs">
              {academicYearCalendar.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3"
                >
                  <span className="text-[11px] font-bold text-indigo-700 shrink-0 w-28">
                    {m.month}
                  </span>
                  <span className="text-[11px] text-slate-700 leading-snug flex-1">
                    {m.milestone}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resource Viewer Modal */}
      <Modal
        open={selectedResourceModal !== null}
        onClose={() => setSelectedResourceModal(null)}
        title={selectedResourceModal?.title ?? "Academic Resource"}
        className="max-w-md"
      >
        <div className="space-y-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            {selectedResourceModal?.content.map((line, idx) => (
              <p key={idx} className="text-slate-800 leading-relaxed font-medium">
                • {line}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">Official Campus Repository</span>
            <Button
              onClick={() => setSelectedResourceModal(null)}
              className="text-xs bg-indigo-600 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
