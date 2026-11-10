"use client";

import { useState, useEffect, useMemo } from "react";
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
  Users,
  Bell,
  Search,
  Flame,
  Radio,
  BarChart3,
  ShieldCheck,
  Check,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Modal } from "@stunet/ui";

import {
  CiaEntry,
  IaEntry,
  SemesterSubjectItem,
  CampusCalendarEvent,
  Faculty,
  CampusNotificationItem,
  CampusPollItem,
  defaultFaculties,
  thirdSemSubjects,
  initialIaExaminations,
  initialCiaAssessments,
  officialAcademicCalendar,
  officialUpcomingEvents,
  defaultNotifications,
} from "@/data/campusScheduleData";

export default function CampusPage() {
  const [campusInfo, setCampusInfo] = useState<{
    id?: string;
    name: string;
    universityName?: string;
    facilities?: string[];
    address?: string;
  }>({
    id: "cmw0t9cgf0005yq6sgrcz4tpy",
    name: "S-VYASA University School of Advanced Studies",
    universityName: "S-VYASA (Deemed to be University)",
    facilities: [
      "Advanced Research Lab",
      "Yoga & Wellness Center",
      "Hostel",
      "Transport",
      "Innovation Sandbox",
    ],
    address: "Prashanti Kutiram, Gundanahalli, Anekal, Bengaluru, Karnataka 560105",
  });

  const [faculties, setFaculties] = useState<Faculty[]>(defaultFaculties);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [selectedFacultyDept, setSelectedFacultyDept] = useState<string>("ALL");

  const [activeIaTab, setActiveIaTab] = useState<"IA 1" | "IA 2">("IA 2");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");

  const [selectedResourceModal, setSelectedResourceModal] = useState<{
    title: string;
    type: "SYLLABUS" | "QUESTION_BANK" | "TIMETABLE";
    content: string[];
  } | null>(null);

  const [notifications, setNotifications] =
    useState<CampusNotificationItem[]>(defaultNotifications);
  const [notificationFilter, setNotificationFilter] = useState<
    "ALL" | "URGENT" | "ACADEMIC" | "EVENT"
  >("ALL");

  const [activeTickerIndex, setActiveTickerIndex] = useState(0);

  // ── CAMPUS-EXCLUSIVE POLLS STATE (Related only to user's campus) ──
  const [activePollIndex, setActivePollIndex] = useState(0);
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(null);
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, string>>({});
  const [campusPolls, setCampusPolls] = useState<CampusPollItem[]>([
    {
      id: "poll-svyasa-1",
      title: "Library Timings",
      category: "Campus Facilities",
      question:
        "Should the S-VYASA campus library and Innovation Sandbox remain open 24/7 during CIA 2 & IA 2 exams?",
      totalVotes: 342,
      endsAt: "Nov 18, 2026",
      options: [
        {
          id: "opt-1",
          label: "Yes, definitely 24/7 access during exam weeks",
          votes: 267,
          pct: 78,
        },
        { id: "opt-2", label: "Open until 2:00 AM on weekdays", votes: 62, pct: 18 },
        { id: "opt-3", label: "Current timings (10:00 PM) are fine", votes: 13, pct: 4 },
      ],
    },
    {
      id: "poll-svyasa-2",
      title: "Hackathon Tracks",
      category: "Innovation Sandbox",
      question:
        "Which domain track should get priority fast-track mentorship sessions for NIAT Hack 2026?",
      totalVotes: 218,
      endsAt: "Nov 17, 2026",
      options: [
        { id: "opt-1", label: "AI Agents & Autonomous Systems", votes: 122, pct: 56 },
        { id: "opt-2", label: "Full-Stack Next.js 15 & Cloud Native", votes: 63, pct: 29 },
        { id: "opt-3", label: "Rust & Systems Programming", votes: 33, pct: 15 },
      ],
    },
  ]);

  const currentPoll = campusPolls[activePollIndex] ?? campusPolls[0];
  const hasVotedOnCurrentPoll = Boolean(userVotedPolls[currentPoll.id]);
  const votedOptionId = userVotedPolls[currentPoll.id];

  function handleVotePoll(pollId: string, optionId: string) {
    if (userVotedPolls[pollId]) return;
    setUserVotedPolls((prev) => ({ ...prev, [pollId]: optionId }));
    setCampusPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const newTotal = poll.totalVotes + 1;
        const updatedOptions = poll.options.map((opt) => {
          const newVotes = opt.id === optionId ? opt.votes + 1 : opt.votes;
          return {
            ...opt,
            votes: newVotes,
            pct: Math.round((newVotes / newTotal) * 100),
          };
        });
        return {
          ...poll,
          totalVotes: newTotal,
          options: updatedOptions,
        };
      }),
    );
  }

  // Sync with current authenticated user's campus identity on mount
  useEffect(() => {
    async function initUserCampus() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.campus) {
            const userCampus = data.user.campus;
            setCampusInfo({
              id: userCampus.id || userCampus.slug,
              name: userCampus.name,
              universityName: userCampus.universityName,
              facilities: userCampus.facilities || [],
              address: userCampus.address,
            });
          }
        }
      } catch {
        // keep initial default
      }
    }
    initUserCampus();
  }, []);

  // Load campus details & faculties from server
  useEffect(() => {
    async function loadCampusData() {
      if (campusInfo.id) {
        try {
          const res = await fetch(`/api/campuses/${campusInfo.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.campus) {
              setCampusInfo((prev) => ({
                ...prev,
                name: data.campus.name || prev.name,
                universityName: data.campus.universityName || prev.universityName,
                facilities: data.campus.facilities || prev.facilities,
                address: data.campus.address || prev.address,
              }));
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
  }, [campusInfo.id]);

  // Load live alerts from API to supplement notifications
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/campus/alerts");
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            const apiAlerts: CampusNotificationItem[] = data.alerts.map(
              (alert: {
                id: string;
                title: string;
                body?: string;
                severity: "INFO" | "WARNING" | "URGENT";
                createdAt: string;
              }) => ({
                id: alert.id,
                title: alert.title,
                description: alert.body || "Official campus notification.",
                category:
                  alert.severity === "URGENT"
                    ? "URGENT"
                    : alert.severity === "WARNING"
                      ? "ACADEMIC"
                      : "EVENT",
                tag: alert.severity === "URGENT" ? "Urgent Alert" : "Campus Notice",
                timestamp: new Date(alert.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                author: "Campus Administration",
                unread: true,
              }),
            );
            setNotifications((prev) => {
              const ids = new Set(apiAlerts.map((a) => a.id));
              return [...apiAlerts, ...prev.filter((p) => !ids.has(p.id))];
            });
          }
        }
      } catch {
        // keep defaults
      }
    }
    fetchAlerts();
  }, []);

  // Live Alerts & Countdown Ticker data
  const liveNewsTicker = [
    {
      id: "news-ia2",
      title: "IA 2 Exam Period: End of November (Expected Nov 23–25)",
      newDate: "Nov 23, 2026 (Tentative)",
      urgent: true,
      countdown: "13 days left",
      category: "EXAMINATION",
    },
    {
      id: "news-1",
      title: "CIA 2 English - Submission Date Extended by 1 day",
      newDate: "Nov 15, 2026",
      urgent: true,
      countdown: "3 days left",
      category: "ASSESSMENT",
    },
    {
      id: "news-yoga",
      title: "Yoga & Wellness (SVY301): University Subject Practical Evaluations",
      newDate: "Nov 26, 2026",
      urgent: false,
      countdown: "16 days left",
      category: "UNIVERSITY",
    },
  ];

  // Auto-cycle live ticker in right division
  useEffect(() => {
    if (liveNewsTicker.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTickerIndex((prev) => (prev + 1) % liveNewsTicker.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [liveNewsTicker.length]);

  // Filtered IA Exams for currently selected tab & subject
  const filteredIaExams = useMemo(() => {
    return initialIaExaminations.filter((exam) => {
      const matchesTab = exam.iaNumber === activeIaTab;
      const matchesSub = selectedSubjectFilter === "ALL" || exam.code === selectedSubjectFilter;
      return matchesTab && matchesSub;
    });
  }, [activeIaTab, selectedSubjectFilter]);

  // Departments list for faculty modal filtering
  const facultyDepartments = useMemo(() => {
    const depts = new Set<string>();
    faculties.forEach((f) => {
      if (f.department) depts.add(f.department);
    });
    return ["ALL", ...Array.from(depts)];
  }, [faculties]);

  // Filtered faculty list inside modal
  const filteredFaculties = useMemo(() => {
    return faculties.filter((fac) => {
      const q = facultySearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        fac.name.toLowerCase().includes(q) ||
        fac.designation.toLowerCase().includes(q) ||
        fac.department.toLowerCase().includes(q) ||
        (fac.officeRoom && fac.officeRoom.toLowerCase().includes(q));

      const matchesDept = selectedFacultyDept === "ALL" || fac.department === selectedFacultyDept;
      return matchesSearch && matchesDept;
    });
  }, [faculties, facultySearch, selectedFacultyDept]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "ALL") return notifications;
    if (notificationFilter === "URGENT") {
      return notifications.filter((n) => n.category === "URGENT");
    }
    if (notificationFilter === "ACADEMIC") {
      return notifications.filter((n) => n.category === "ACADEMIC" || n.category === "EXAM");
    }
    if (notificationFilter === "EVENT") {
      return notifications.filter((n) => n.category === "EVENT" || n.category === "FACILITY");
    }
    return notifications;
  }, [notifications, notificationFilter]);

  const unreadNotificationsCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. TOP FULL-WIDTH COLLEGE NAME SECTION (FILTER REMOVED, FILL WIDTH) ── */}
      <div className="w-full bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {campusInfo.name}
                </h1>
                <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  3rd Sem • 2025 Batch
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-1.5">
                <span>{campusInfo.universityName || "NIAT Partner Institution"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 inline" />
                  {campusInfo.address || "Main Campus"}
                </span>
              </p>
            </div>
          </div>

          {/* Facilities Tags */}
          {campusInfo.facilities && campusInfo.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {campusInfo.facilities.map((fac, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-indigo-50/80 border border-indigo-100/90 text-indigo-700 font-semibold px-2.5 py-1 text-[11px] sm:text-xs"
                >
                  {fac}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── FACULTY DIRECTORY BUTTON (PROMINENT, GOOD SIZE IN COLLEGE NAME SECTION) ── */}
        <div className="shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => setIsFacultyModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-indigo-400/20 group"
          >
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-left pr-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">Campus Faculty</span>
                <span className="text-xs font-black bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {faculties.length}
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium">Mentors, Cabins & Contacts</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* ── 2. 3RD SEMESTER SUBJECTS & COURSE CODES MATRIX ── */}
      <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
        <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>3rd Semester Course Codes & Subject Directory</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  7 Subjects
                </span>
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Curriculum by NIAT (6 Core Subjects) + S-VYASA University Course (Yoga and
                Wellness).
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 self-start sm:self-auto bg-white px-2.5 py-1 rounded-xl border border-slate-200">
            Batch: 2025 Joined Students
          </span>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {thirdSemSubjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                      {sub.code}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        sub.handledBy === "University"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      }`}
                    >
                      {sub.handledBy === "University" ? "University Subject" : "NIAT Main"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{sub.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sub.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                  <span>{sub.credits} Credits</span>
                  <span>{sub.type}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── MAIN TWO-COLUMN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ══════════════════════════════════════════════════════════════
            LEFT DIVISION (lg:col-span-7):
            1. IA Exam Hub (IA 1 & IA 2 with full syllabus & timetable)
            2. Continuous Internal Assessments (CIA 1, 2, 3)
            3. Academic Calendar Of Year (2026–2027 Official S-VYASA)
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-6">
          {/* ── Section: IA Exam Hub (IA 1, IA 2) ── */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span>3rd Sem IA Exam Hub (Internal Assessments 1 & 2)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Unit-wise syllabus breakdown, exam timings, and verified resource kits.
                </p>
              </div>

              {/* IA 1 vs IA 2 Segmented Pills */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto">
                {(["IA 2", "IA 1"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveIaTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeIaTab === tab
                        ? "bg-white text-purple-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab}</span>
                    {tab === "IA 2" && (
                      <span className="text-[9px] px-1 py-0.2 bg-amber-500 text-white rounded-full font-bold">
                        Upcoming
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>

            {/* IA 2 Status Banner */}
            {activeIaTab === "IA 2" && (
              <div className="bg-amber-50/80 border-b border-amber-200/80 p-3 px-4 flex items-center justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>IA 2 Dates:</strong> Final timetable to be announced. Expected at the{" "}
                    <strong>end of November (Nov 23–26, 2026)</strong> as per Academic Calendar.
                  </span>
                </div>
                <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                  Tentative
                </span>
              </div>
            )}

            {/* Subject Filter Pills */}
            <div className="p-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto text-[10px] bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === "ALL"
                    ? "bg-purple-700 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Subjects (
                {initialIaExaminations.filter((e) => e.iaNumber === activeIaTab).length})
              </button>
              {thirdSemSubjects.map((sub) => (
                <button
                  key={sub.code}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(sub.code)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                    selectedSubjectFilter === sub.code
                      ? "bg-purple-700 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {sub.code}
                </button>
              ))}
            </div>

            <CardContent className="p-4 space-y-3.5">
              {filteredIaExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-200 transition-colors shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          {exam.code}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {exam.subject}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{exam.date}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>
                            {exam.time} [{exam.session}]
                          </span>
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                            exam.handledBy === "University"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-50 text-indigo-700"
                          }`}
                        >
                          {exam.handledBy === "University"
                            ? "S-VYASA University"
                            : "NIAT Main Subject"}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {exam.isTentative && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          End of Nov
                        </span>
                      )}
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        {exam.iaNumber}
                      </span>
                    </div>
                  </div>

                  {/* 3 Mandated Resource Blocks: Syllabus, TimeTable, Question Bank */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    {/* 1. Syllabus */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `[${exam.code}] ${exam.subject} — ${exam.iaNumber} Syllabus Topics`,
                          type: "SYLLABUS",
                          content: exam.syllabusTopics.map(
                            (topic, idx) => `Topic ${idx + 1}: ${topic}`,
                          ),
                        })
                      }
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 text-left transition-colors group cursor-pointer"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {exam.syllabusTopics.length} Topics Covered
                      </span>
                      <span className="font-bold text-slate-800 group-hover:text-purple-600 flex items-center justify-between mt-0.5">
                        <span>Syllabus Breakdown</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>

                    {/* 2. Timetable */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `[${exam.code}] ${exam.iaNumber} Official Examination Timetable`,
                          type: "TIMETABLE",
                          content: [
                            `Subject: ${exam.subject} (${exam.code})`,
                            `Session Slot: ${exam.time} [${exam.session}]`,
                            `Exam Date: ${exam.date}`,
                            "Venue: Main University Academic Block (Exam Halls)",
                            "Admit Card & Student ID Card Mandatory",
                            "Reporting time: 20 minutes prior to paper distribution.",
                          ],
                        })
                      }
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 text-left transition-colors group cursor-pointer"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Session Slot
                      </span>
                      <span className="font-bold text-slate-800 group-hover:text-purple-600 flex items-center justify-between mt-0.5">
                        <span>Exam Schedule</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                    </button>

                    {/* 3. Question Bank */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `[${exam.code}] ${exam.subject} — Verified Question Bank`,
                          type: "QUESTION_BANK",
                          content: [
                            `Course Code: ${exam.code} • 3rd Semester B.Tech CSE`,
                            "Section A: 10 Short Answer Questions (2 Marks each)",
                            "Section B: 4 Analytical Problem Scenarios (10 Marks each)",
                            "Includes previous academic year solved problem sets & unit models.",
                          ],
                        })
                      }
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 text-left transition-colors group cursor-pointer"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Model Papers
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

          {/* ── Section: CIA (Continuous Internal Assessments) ── */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>CIA (Continuous Internal Assessments: CIA 1, 2, 3)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Academic mark freezing dates & assignments from the S-VYASA Academic Calendar.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {initialCiaAssessments.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 transition-colors shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        {item.ciaNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{item.subject}</span>
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
                    <span className="text-slate-400 font-bold">Scope: </span>
                    {item.topic}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Freezing / Due Date: {item.submissionDate}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${item.ciaNumber} — ${item.subject} Rubrics`,
                          type: "SYLLABUS",
                          content: [
                            `Subject: ${item.subject}`,
                            `Assessment: ${item.ciaNumber}`,
                            `Scope: ${item.topic}`,
                            "Formatting: IEEE Conference 2-Column Template / LMS Portal",
                            `Submission / Mark Freezing Date: ${item.submissionDate}`,
                          ],
                        })
                      }
                      className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Instructions</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Section: Academic Calendar Of Year (2026–2027 S-VYASA) ── */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                    S-VYASA Academic Calendar 2026–2027
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official schedule for 2025-26 batch B.Tech CSE (3rd & 4th Semesters).
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Official
              </span>
            </CardHeader>

            <CardContent className="p-3.5 space-y-2.5 text-xs">
              {officialAcademicCalendar.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 hover:bg-slate-100/70 transition-colors"
                >
                  <span className="text-[11px] font-black text-indigo-700 shrink-0 sm:w-40">
                    {m.month}
                  </span>
                  <span className="text-[11px] text-slate-700 leading-relaxed flex-1">
                    {m.milestone}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT DIVISION (lg:col-span-5):
            1. Live Campus Ticker & Events
            2. Campus Notifications & Updates
            3. Campus-Exclusive Poll (Under Notifications)
            4. Live & Upcoming Campus Events (Calendar of events)
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-6">
          {/* ── 1. LIVE EVENT SECTIONS IN RIGHT DIVISION: LIVE CAMPUS TICKER ── */}
          <Card className="border-slate-200/90 shadow-sm overflow-hidden">
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 p-0.5">
              <div className="rounded-[14px] bg-slate-950 text-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                      Live Campus Ticker
                    </span>
                  </div>

                  <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    {liveNewsTicker[activeTickerIndex]?.countdown}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold leading-snug">
                    {liveNewsTicker[activeTickerIndex]?.title}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Target Date:{" "}
                    <span className="font-semibold text-white">
                      {liveNewsTicker[activeTickerIndex]?.newDate}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Updated by Academic Dean & Exam Cell</span>
                  <div className="flex items-center gap-1.5">
                    {liveNewsTicker.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveTickerIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          activeTickerIndex === idx ? "w-5 bg-indigo-400" : "w-1.5 bg-slate-700"
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ── 2. NOTIFICATION SECTION: NEW UPDATES RELATED TO CAMPUS ── */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Campus Notifications & Updates</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {unreadNotificationsCount} New
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Official circulars, deadline alerts, and updates.
                  </p>
                </div>
              </div>

              {/* Notification Filter Pills */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg self-start sm:self-auto text-[10px]">
                {(
                  [
                    { id: "ALL", label: "All" },
                    { id: "URGENT", label: "Urgent" },
                    { id: "ACADEMIC", label: "Academics" },
                    { id: "EVENT", label: "Events" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNotificationFilter(tab.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      notificationFilter === tab.id
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3.5 space-y-2.5 max-h-[380px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <p className="text-xs text-slate-500">No updates in this category.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all shadow-2xs space-y-1.5 ${
                      notif.unread
                        ? "bg-indigo-50/40 border-indigo-200 hover:border-indigo-300"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            notif.category === "URGENT"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : notif.category === "ACADEMIC" || notif.category === "EXAM"
                                ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                : notif.category === "EVENT"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {notif.tag}
                        </span>

                        {notif.unread && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {notif.timestamp}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {notif.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">By:</span>
                        <span className="text-slate-700 font-semibold">{notif.author}</span>
                      </span>

                      {notif.category === "URGENT" && (
                        <span className="flex items-center gap-0.5 text-rose-600 font-bold text-[10px]">
                          <Flame className="h-2.5 w-2.5" />
                          <span>Urgent</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* ── 3. CAMPUS-EXCLUSIVE POLL (IN RIGHT DIVISION UNDER NOTIFICATIONS) ── */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Campus Student Poll</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Campus Only
                    </span>
                  </CardTitle>
                </div>
              </div>

              {/* Campus Scope Indicator */}
              <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="h-3 w-3 text-indigo-600" />
                <span className="max-w-[120px] truncate">{campusInfo.name.split(" ")[0]} Only</span>
              </div>
            </CardHeader>

            {/* Poll Tabs for Campus Topics */}
            <div className="p-1 border-b border-slate-100 flex gap-1 text-[10px] bg-slate-50/60 overflow-x-auto">
              {campusPolls.map((poll, idx) => (
                <button
                  key={poll.id}
                  type="button"
                  onClick={() => {
                    setActivePollIndex(idx);
                    setSelectedPollOption(null);
                  }}
                  className={`py-1 px-2.5 rounded-md font-semibold transition-all shrink-0 ${
                    activePollIndex === idx
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {poll.title}
                </button>
              ))}
            </div>

            <CardContent className="p-3.5 space-y-3 text-xs">
              {/* Question Statement */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  {currentPoll.category}
                </span>
                <p className="font-bold text-slate-900 leading-snug text-xs sm:text-[13px]">
                  {currentPoll.question}
                </p>
              </div>

              {/* Poll Options Matrix */}
              <div className="space-y-2">
                {currentPoll.options.map((opt) => {
                  const isSubmitted = votedOptionId === opt.id;
                  const isSelected = selectedPollOption === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={hasVotedOnCurrentPoll}
                      onClick={() => {
                        if (hasVotedOnCurrentPoll) return;
                        setSelectedPollOption(opt.id);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-medium transition-all relative overflow-hidden ${
                        hasVotedOnCurrentPoll
                          ? isSubmitted
                            ? "border-indigo-600 bg-indigo-50/70 font-bold text-indigo-900 ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white text-slate-700 opacity-90"
                          : isSelected
                            ? "border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900 ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300"
                      } ${hasVotedOnCurrentPoll ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {/* Animated Percentage Bar upon voting */}
                      {hasVotedOnCurrentPoll && (
                        <div
                          className="absolute inset-y-0 left-0 bg-indigo-100/70 transition-all duration-700"
                          style={{ width: `${opt.pct}%` }}
                        />
                      )}

                      <div className="relative flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          {!hasVotedOnCurrentPoll && (
                            <div
                              className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-600"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          )}
                          <span className="truncate">{opt.label}</span>
                        </div>

                        {/* Revealed Percentage numbers */}
                        {hasVotedOnCurrentPoll && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSubmitted && (
                              <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-200/70 px-1.5 py-0.5 rounded">
                                Your Vote
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-slate-800">{opt.pct}%</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Vote Submission Action / Confirmation */}
              {!hasVotedOnCurrentPoll ? (
                <button
                  type="button"
                  disabled={!selectedPollOption}
                  onClick={() => {
                    if (selectedPollOption) {
                      handleVotePoll(currentPoll.id, selectedPollOption);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Submit Campus Vote</span>
                </button>
              ) : (
                <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center flex items-center justify-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Vote recorded for {campusInfo.name.split(" ")[0]} campus ballot</span>
                </div>
              )}

              {/* Poll Metadata & Verification Notice */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                <span>{currentPoll.totalVotes} campus votes recorded</span>
                <span>Closes {currentPoll.endsAt}</span>
              </div>
            </CardContent>
          </Card>

          {/* ── 4. LIVE EVENTS & CALENDAR OF EVENTS (OFFICIAL S-VYASA CALENDAR) ── */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>Upcoming Events & Academic Milestones</span>
              </CardTitle>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 text-indigo-600 animate-pulse" />
                <span>Active</span>
              </span>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-slate-100">
              {officialUpcomingEvents.map((ev) => (
                <div key={ev.id} className="py-3 space-y-1.5 first:pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 leading-snug">
                      {ev.title}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        ev.isLive
                          ? "bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"
                          : ev.type === "WORKSHOP"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : ev.type === "FEST"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ev.isLive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                      )}
                      <span>{ev.type}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{ev.date}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{ev.location}</span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── FACULTY DIRECTORY MODAL (OPENS WHEN USER CLICKS FACULTY BUTTON) ── */}
      <Modal
        open={isFacultyModalOpen}
        onClose={() => setIsFacultyModalOpen(false)}
        title="Campus Faculties & Department Mentors"
        description="Official faculty contact details, designations, and office cabin locations."
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-hidden flex flex-col">
          {/* Search & Department Filters inside Modal */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty by name, department, cabin..."
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
              />
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {facultyDepartments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedFacultyDept(dept)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedFacultyDept === dept
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {dept === "ALL" ? "All Departments" : dept}
                </button>
              ))}
            </div>
          </div>

          {/* Faculty Members Cards Grid */}
          <div className="overflow-y-auto max-h-[55vh] pr-1 space-y-3">
            {filteredFaculties.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                <Users className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No Faculty Found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search query or department filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredFaculties.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200 shrink-0">
                        {fac.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {fac.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-indigo-600 truncate">
                          {fac.designation}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">{fac.department}</span>
                    </div>

                    <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                      {fac.email && (
                        <a
                          href={`mailto:${fac.email}`}
                          className="flex items-center gap-2 hover:text-indigo-600 transition-colors truncate"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{fac.email}</span>
                        </a>
                      )}
                      {fac.phone && (
                        <a
                          href={`tel:${fac.phone}`}
                          className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{fac.phone}</span>
                        </a>
                      )}
                      {fac.officeRoom && (
                        <p className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>{fac.officeRoom}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredFaculties.length} of {faculties.length} faculty mentors
            </span>
            <Button
              onClick={() => setIsFacultyModalOpen(false)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── RESOURCE VIEWER MODAL (SYLLABUS TOPICS, TIMETABLE, QUESTION BANK) ── */}
      <Modal
        open={selectedResourceModal !== null}
        onClose={() => setSelectedResourceModal(null)}
        title={selectedResourceModal?.title ?? "Academic Resource"}
        className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-3 pt-2 text-xs flex-1 overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 overflow-y-auto max-h-[55vh]">
            {selectedResourceModal?.content.map((line, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-white border border-slate-100 text-slate-800 leading-relaxed font-medium flex items-start gap-2"
              >
                <span className="text-purple-600 font-bold shrink-0">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              S-VYASA University & NIAT Official Curriculum
            </span>
            <Button
              onClick={() => setSelectedResourceModal(null)}
              className="text-xs bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
