"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Download,
  ChevronRight,
  BookOpen,
  CalendarDays,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Modal } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";

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

interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string | null;
  phone: string | null;
  officeRoom: string | null;
}

export default function CampusPage() {
  const [geoScope, setGeoScope] = useState<GeoFilterSelection>({
    type: "MY_CAMPUS",
    name: "My Campus (NIAT Chennai)",
    id: "niat-chennai",
  });

  const [activeIaTab, setActiveIaTab] = useState<"IA 1" | "IA 2">("IA 1");
  const [selectedResourceModal, setSelectedResourceModal] = useState<{
    title: string;
    type: "SYLLABUS" | "QUESTION_BANK" | "TIMETABLE";
    content: string[];
  } | null>(null);

  const [campusInfo, setCampusInfo] = useState<{
    name: string;
    universityName?: string;
    facilities?: string[];
    address?: string;
  }>({
    name: "NIAT Chennai Central",
    universityName: "B. S. Abdur Rahman Crescent Institute of Science and Technology",
    facilities: [
      "#Cipher Coding Zone",
      "iHACK Cybersecurity Lab",
      "Apple iOS Lab",
      "Hostel (AC/Non-AC)",
      "Transport",
    ],
    address: "GST Road, Vandalur, Chennai, Tamil Nadu 600048",
  });

  const [faculties, setFaculties] = useState<Faculty[]>([
    {
      id: "fac-1",
      name: "Dr. K. S. Ramanathan",
      designation: "Professor & Head of Department",
      department: "Computer Science & Engineering",
      email: "hod.cse@niat.edu.in",
      phone: "+91 98401 23456",
      officeRoom: "Tech Block A - Room 302",
    },
    {
      id: "fac-2",
      name: "Dr. Meera Vasudevan",
      designation: "Associate Professor & Lead AI Researcher",
      department: "Artificial Intelligence & Data Science",
      email: "meera.ai@niat.edu.in",
      phone: "+91 98402 34567",
      officeRoom: "Innovation Hub - Room 104",
    },
    {
      id: "fac-3",
      name: "Prof. Arvind Swaminathan",
      designation: "Assistant Professor & Industry Mentor",
      department: "Computer Science & Cloud Systems",
      email: "arvind.cloud@niat.edu.in",
      phone: "+91 98403 45678",
      officeRoom: "Coding Lab Block B - Room 201",
    },
  ]);

  // Load campus details when scope changes
  useEffect(() => {
    async function loadCampusData() {
      if (geoScope.id) {
        try {
          const res = await fetch(`/api/campuses/${geoScope.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.campus) {
              setCampusInfo({
                name: data.campus.name,
                universityName: data.campus.universityName,
                facilities: data.campus.facilities || [],
                address: data.campus.address,
              });
              if (data.campus.faculties && data.campus.faculties.length > 0) {
                setFaculties(data.campus.faculties);
              }
            }
          }
        } catch {
          // keep fallback
        }
      }
    }
    loadCampusData();
  }, [geoScope.id]);

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
      topic: "Custom Process Scheduler & Virtual Memory Simulation in Rust",
      submissionDate: "Dec 05, 2026",
      status: "PENDING",
    },
  ];

  // IA Examination Matrix (IA 1, IA 2)
  const iaExaminations: IaEntry[] = [
    {
      id: "ia-1-dbms",
      iaNumber: "IA 1",
      subject: "Database Management Systems",
      code: "CS401",
      date: "Nov 24, 2026",
      time: "10:00 AM – 11:30 AM",
      syllabusTopics: ["Relational Algebra", "SQL Joins & Grouping", "Functional Dependencies"],
    },
    {
      id: "ia-1-algo",
      iaNumber: "IA 1",
      subject: "Design & Analysis of Algorithms",
      code: "CS402",
      date: "Nov 26, 2026",
      time: "10:00 AM – 11:30 AM",
      syllabusTopics: [
        "Asymptotic Notations",
        "Divide and Conquer (Master Theorem)",
        "Greedy Methods",
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
        "Inter-Process Communication",
        "Deadlock Avoidance (Banker's)",
        "Paging & Segmentation",
      ],
    },
  ];

  // Calendars
  const calendarEvents: CampusCalendarEvent[] = [
    {
      id: "ev-1",
      title: "Inter-Campus Hackathon 'NIAT Hack 2026'",
      date: "Nov 20 – 21, 2026",
      type: "WORKSHOP",
      location: "Innovation Sandbox, Block B",
    },
    {
      id: "ev-2",
      title: "Annual Tech Symposium & Project Expo",
      date: "Dec 12, 2026",
      type: "FEST",
      location: "Main University Auditorium",
    },
    {
      id: "ev-3",
      title: "Semester Break & Winter Holidays",
      date: "Dec 24, 2026 – Jan 03, 2027",
      type: "HOLIDAY",
      location: "All Campus Blocks",
    },
  ];

  const academicYearCalendar = [
    { month: "August 2026", milestone: "Semester Orientation & Commencements" },
    { month: "October 2026", milestone: "CIA 1 Assessment Evaluations" },
    { month: "November 2026", milestone: "CIA 2 Submissions & IA 1 Examinations" },
    { month: "December 2026", milestone: "CIA 3 Final Reviews & IA 2 Examinations" },
    { month: "January 2027", milestone: "End-Semester Practical Lab Vivas & Finals" },
  ];

  const filteredIaExams = iaExaminations.filter((exam) => exam.iaNumber === activeIaTab);

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP LIVE NOTIFICATION TICKER & COUNTDOWN BANNER ── */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 p-0.5 shadow-md">
        <div className="rounded-[22px] bg-slate-950/90 text-white p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
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

      {/* Page Header with Advanced Campus Switcher */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {campusInfo.name}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {campusInfo.universityName || "NIAT Partner Institution"} •{" "}
            {campusInfo.address || "Main Campus"}
          </p>

          {/* Facilities Tags */}
          {campusInfo.facilities && campusInfo.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {campusInfo.facilities.map((fac, i) => (
                <span
                  key={i}
                  className="rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 text-[10px]"
                >
                  {fac}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Global Campus Filter */}
        <div className="flex items-center gap-2">
          <AdvancedSelectList
            currentSelection={geoScope}
            onSelect={(sel) => setGeoScope(sel)}
            userCampusName="NIAT Chennai"
          />
        </div>
      </div>

      {/* ── FACULTIES & MENTORS DIRECTORY ── */}
      <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
        <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>Campus Faculties & Department Mentors</span>
            </CardTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Official faculty contact details, designations, and office cabin locations.
            </p>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
            {faculties.length} Faculty Members
          </span>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {faculties.map((fac) => (
              <div
                key={fac.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 transition-colors shadow-2xs space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs border border-indigo-100">
                    {fac.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{fac.name}</h4>
                    <p className="text-[10px] font-semibold text-indigo-600">{fac.designation}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600">{fac.department}</p>

                <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                  {fac.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>{fac.email}</span>
                    </p>
                  )}
                  {fac.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{fac.phone}</span>
                    </p>
                  )}
                  {fac.officeRoom && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{fac.officeRoom}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── DESKTOP 60/40 SPLIT: CIA 1-3 & IA 1-2 RESOURCE CARDS ── */}
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
                      <span>Due Date: {item.submissionDate}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${item.ciaNumber} — ${item.subject} Rubrics`,
                          type: "SYLLABUS",
                          content: [
                            `Topic: ${item.topic}`,
                            "Formatting: IEEE Conference 2-Column Template",
                            "Plagiarism limit: Maximum 10% allowed",
                            `Final Submission Due: ${item.submissionDate}`,
                          ],
                        })
                      }
                      className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] flex items-center gap-0.5"
                    >
                      <span>Instructions</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section: IA Exam Hub (IA 1, IA 2) */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span>IA Exam Hub (Internal Assessments: IA 1, IA 2)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Syllabus breakdown, official exam timetables, and verified question banks.
                </p>
              </div>

              {/* IA 1 vs IA 2 Segmented Pills */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto">
                {(["IA 1", "IA 2"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveIaTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeIaTab === tab
                        ? "bg-white text-purple-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {filteredIaExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-200 transition-colors shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {exam.subject} ({exam.code})
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{exam.date}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{exam.time}</span>
                        </span>
                      </p>
                    </div>

                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                      {exam.iaNumber}
                    </span>
                  </div>

                  {/* 3 Mandated Resource Blocks: Syllabus, TimeTable, Question Bank */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    {/* 1. Syllabus */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${exam.subject} — Detailed Syllabus Units`,
                          type: "SYLLABUS",
                          content: exam.syllabusTopics.map((t, idx) => `Unit ${idx + 1}: ${t}`),
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
