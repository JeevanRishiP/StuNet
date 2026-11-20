"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  BarChart3,
  Check,
  ExternalLink,
  Pencil,
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  GraduationCap,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Modal } from "@stunet/ui";
import PollCreatorHeader from "@/components/PollCreatorHeader";
import PollCommentSection from "@/components/PollCommentSection";

import {
  IaEntry,
  CiaEntry,
  SemesterSubjectItem,
  Faculty,
  CampusNotificationItem,
  CampusPollItem,
} from "@/data/campusScheduleData";

interface LivePollOption {
  id: string;
  text: string;
  votes: number | null;
  percent: number | null;
}

interface LivePollItem {
  id: string;
  postId: string;
  question: string;
  pollType?: string;
  complaintLevel?: string | null;
  section?: string | null;
  batch?: string | null;
  calculationBasis?: string;
  totalTargetStudents?: number | null;
  geoScope?: string;
  scope: string;
  campusId: string | null;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorRole: string;
  authorCampus?: { id?: string; name?: string } | null;
  isAnonymous?: boolean;
  createdAt: string;
  closesAt?: string | null;
  totalVotes: number;
  hasVoted: boolean;
  userSelectedOptionIds: string[];
  commentCount?: number;
  options: LivePollOption[];
}

interface ComplaintPollItem {
  id: string;
  title: string;
  level: "CAMPUS" | "SECTION";
  section?: string;
  category: string;
  question: string;
  status: "UNDER_REVIEW" | "ESCALATED" | "ACTION_REQUIRED" | "RESOLVED";
  totalVotes: number;
  endsAt: string;
  options: { id: string; label: string; votes: number; pct: number }[];
}

interface RenderablePollOption {
  id: string;
  text?: string;
  label?: string;
  votes?: number | null;
  percent?: number | null;
  pct?: number;
}

interface RenderablePollItem {
  id: string;
  postId?: string;
  question: string;
  title?: string;
  category?: string;
  scope?: string;
  authorName?: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorRole?: string;
  authorCampus?: { id?: string; name?: string } | null;
  createdAt?: string;
  isAnonymous?: boolean;
  hasVoted?: boolean;
  userSelectedOptionIds?: string[];
  submissionMode?: "SINGLE_SUBMIT" | "MULTIPLE_SUBMIT";
  totalVotes?: number;
  complaintLevel?: string | null;
  section?: string | null;
  batch?: string | null;
  calculationBasis?: string;
  totalTargetStudents?: number | null;
  commentCount?: number;
  closesAt?: string | null;
  options: RenderablePollOption[];
}

function checkIsHoliday(title: string, eventType?: string): boolean {
  const type = (eventType || "").toLowerCase();
  const t = title.toLowerCase();
  return (
    type === "holiday" ||
    t.includes("holiday") ||
    t.includes("independence") ||
    t.includes("id-milad") ||
    t.includes("chaturthi") ||
    t.includes("jayanthi") ||
    t.includes("pooja") ||
    t.includes("vijayadashami") ||
    t.includes("deepavali") ||
    t.includes("diwali") ||
    t.includes("christmas") ||
    t.includes("kalpatharu") ||
    t.includes("sankranti") ||
    t.includes("republic")
  );
}

export default function CampusPage() {
  const [campusInfo, setCampusInfo] = useState<{
    id?: string;
    name: string;
    universityName?: string;
    facilities?: string[];
    address?: string;
  }>({
    id: "cmw0t9cgf0005yq6sgrcz4tpy",
    name: "",
    universityName: "",
    facilities: [],
    address: "",
  });

  // Section Details state (editable ONLY by Campus Admin)
  const [currentSection, setCurrentSection] = useState<string>("");
  const [userYearText, setUserYearText] = useState<string>("2nd Year");
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [sectionInputValue, setSectionInputValue] = useState("");
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [sectionSaveError, setSectionSaveError] = useState<string | null>(null);

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isCiaModalOpen, setIsCiaModalOpen] = useState(false);
  const [isIaModalOpen, setIsIaModalOpen] = useState(false);
  const [isSaModalOpen, setIsSaModalOpen] = useState(false);
  const [isSeeModalOpen, setIsSeeModalOpen] = useState(false);
  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [selectedFacultyDept, setSelectedFacultyDept] = useState<string>("ALL");

  const [activeCiaTab, setActiveCiaTab] = useState<"CIA 1" | "CIA 2" | "CIA 3">("CIA 2");
  const [activeIaTab, setActiveIaTab] = useState<"IA 1" | "IA 2">("IA 2");
  const [activeSaTab, setActiveSaTab] = useState<"SA 2" | "SA 1">("SA 2");

  // Selected subject for compact master-detail navigation in IA, CIA, SA, SEE
  const [selectedIaSubjectCode, setSelectedIaSubjectCode] = useState<string>("");
  const [selectedCiaSubjectCode, setSelectedCiaSubjectCode] = useState<string>("");
  const [selectedSaSubjectCode, setSelectedSaSubjectCode] = useState<string>("");
  const [selectedSeeSubjectCode, setSelectedSeeSubjectCode] = useState<string>("");

  // Dynamic schedules & courses (strictly loaded from PostgreSQL database)
  const [iaExams, setIaExams] = useState<IaEntry[]>([]);
  const [saExams, setSaExams] = useState<IaEntry[]>([]);
  const [seeExams, setSeeExams] = useState<IaEntry[]>([]);
  const [ciaAssessments, setCiaAssessments] = useState<CiaEntry[]>([]);
  const [coursesList, setCoursesList] = useState<SemesterSubjectItem[]>([]);

  // Calendar & Upcoming Events with Semester Odd & Even grouping, Month boxing, and Holidays tab
  const [calendarTab, setCalendarTab] = useState<"ALL" | "HOLIDAYS">("ALL");
  const [upcomingEventsTab, setUpcomingEventsTab] = useState<"ALL" | "MANAGEMENT" | "CLUBS">("ALL");
  const currentMonthRef = useRef<HTMLDivElement>(null);

  const [academicCalendar, setAcademicCalendar] = useState<
    Array<{
      id?: string;
      rawDate: string;
      monthShort: string;
      monthLong: string;
      dateFormatted: string;
      dayNumber: number;
      semester: "ODD" | "EVEN";
      milestone: string;
      eventType?: string;
      isHoliday: boolean;
      description?: string;
    }>
  >([]);

  const [upcomingEvents, setUpcomingEvents] = useState<
    Array<{
      id: string;
      title: string;
      rawDate: string;
      date: string;
      timeFormatted?: string;
      monthLong: string;
      type: "MANAGEMENT" | "CLUB" | "EXAM" | "FEST" | "HOLIDAY" | "WORKSHOP";
      source?: string;
      location: string;
      details?: string;
      link?: string | null;
      isLive?: boolean;
      isHoliday: boolean;
    }>
  >([]);

  // Authentication & Campus Admin permission enforcement
  const [currentUserRole, setCurrentUserRole] = useState<string>("STUDENT");
  const isCampusAdmin = currentUserRole === "CAMPUS_MANAGER" || currentUserRole === "SUPER_ADMIN";

  // Editing Modals state (Campus Admin only)
  const [editingIaExam, setEditingIaExam] = useState<IaEntry | null>(null);
  const [editingCiaItem, setEditingCiaItem] = useState<CiaEntry | null>(null);
  const [editingCourse, setEditingCourse] = useState<SemesterSubjectItem | null>(null);

  const [selectedResourceModal, setSelectedResourceModal] = useState<{
    title: string;
    type: "SYLLABUS" | "QUESTION_BANK" | "TIMETABLE";
    content: string[];
  } | null>(null);

  const [notifications, setNotifications] = useState<CampusNotificationItem[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<
    "ALL" | "URGENT" | "ACADEMIC" | "EVENT"
  >("ALL");

  const [activeTickerIndex, setActiveTickerIndex] = useState(0);

  // ── POLL SECTION STATE (Inside Left Division per wireframe) ──
  // Sub-sections: General Poll | Complaint Poll
  const [activePollSubSection, setActivePollSubSection] = useState<"GENERAL" | "COMPLAINT">(
    "GENERAL",
  );
  // Complaint Poll filter tabs: General | Campus | Batch | Section
  const [activeComplaintFilter, setActiveComplaintFilter] = useState<
    "ALL" | "GENERAL" | "CAMPUS" | "BATCH" | "SECTION"
  >("ALL");
  const [showComplaintInfoTooltip, setShowComplaintInfoTooltip] = useState(false);

  // Report Modal State
  const [reportingPollPostId, setReportingPollPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Live Database Polls
  const [livePolls, setLivePolls] = useState<LivePollItem[]>([]);
  const [openCommentPollIds, setOpenCommentPollIds] = useState<Record<string, boolean>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const loadCampusPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/polls?limit=50");
      if (res.ok) {
        const json = await res.json();
        setLivePolls(json.polls || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void loadCampusPolls();
  }, [loadCampusPolls]);

  // General Campus Polls
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, string>>({});
  const [campusPolls, setCampusPolls] = useState<CampusPollItem[]>([]);

  // Complaint Polls Data (Campus Level & Section Level)
  const [complaintPolls, setComplaintPolls] = useState<ComplaintPollItem[]>([]);

  // Live Polls filtered for user's campus and section only (Excludes general non-campus polls)
  const liveGeneralPolls = useMemo(() => {
    return livePolls.filter((p) => {
      if (p.pollType === "COMPLAINT") return false;
      const matchesCampus =
        p.campusId === campusInfo.id ||
        p.geoScope === "CAMPUS" ||
        p.authorCampus?.id === campusInfo.id ||
        (campusInfo.name && p.scope?.toLowerCase().includes(campusInfo.name.toLowerCase()));
      return matchesCampus;
    });
  }, [livePolls, campusInfo]);

  const liveComplaintPolls = useMemo(() => {
    return livePolls.filter((p) => {
      if (p.pollType !== "COMPLAINT") return false;
      if (activeComplaintFilter === "ALL") return true;
      if (activeComplaintFilter === "GENERAL") {
        return !p.complaintLevel || p.complaintLevel === "GENERAL";
      }
      if (activeComplaintFilter === "CAMPUS") {
        return p.complaintLevel === "CAMPUS" || p.scope?.toLowerCase().includes("campus");
      }
      if (activeComplaintFilter === "BATCH") {
        return p.complaintLevel === "BATCH";
      }
      if (activeComplaintFilter === "SECTION") {
        const userSec = currentSection ? currentSection.toLowerCase().replace(/[\s|_]/g, "") : "";
        const pollSec = p.section ? p.section.toLowerCase().replace(/[\s|_]/g, "") : "";
        const isMatch =
          p.complaintLevel === "SECTION" &&
          (!userSec || !pollSec || pollSec === userSec || p.scope?.toLowerCase().includes(userSec));
        return isMatch;
      }
      return true;
    });
  }, [livePolls, activeComplaintFilter, currentSection]);

  const filteredComplaintPolls = useMemo(() => {
    return complaintPolls.filter((p) => p.level === activeComplaintFilter);
  }, [complaintPolls, activeComplaintFilter]);

  async function handleVoteLivePoll(pollId: string, optionId: string) {
    if (votingPollId) return;
    setVotingPollId(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOptionIds: [optionId] }),
      });
      if (res.ok) {
        await loadCampusPolls();
      }
    } catch (err) {
      console.error("Failed to submit poll vote", err);
    } finally {
      setVotingPollId(null);
    }
  }

  function handleVoteGeneralPoll(pollId: string, optionId: string) {
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

  function handleVoteComplaintPoll(pollId: string, optionId: string) {
    if (userVotedPolls[pollId]) return;
    setUserVotedPolls((prev) => ({ ...prev, [pollId]: optionId }));
    setComplaintPolls((prev) =>
      prev.map((cp) => {
        if (cp.id !== pollId) return cp;
        const newTotal = cp.totalVotes + 1;
        const updatedOptions = cp.options.map((opt) => {
          const newVotes = opt.id === optionId ? opt.votes + 1 : opt.votes;
          return {
            ...opt,
            votes: newVotes,
            pct: Math.round((newVotes / newTotal) * 100),
          };
        });
        return {
          ...cp,
          totalVotes: newTotal,
          options: updatedOptions,
        };
      }),
    );
  }

  // Handle saving Section by Campus Admin
  async function handleSaveSection(e: React.FormEvent) {
    e.preventDefault();
    if (!isCampusAdmin || isSavingSection) return;

    setIsSavingSection(true);
    setSectionSaveError(null);
    try {
      const res = await fetch("/api/campus/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sectionInputValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSectionSaveError(data.error || "Failed to update section.");
      } else {
        setCurrentSection(data.section || sectionInputValue.trim());
        setIsEditSectionModalOpen(false);
      }
    } catch {
      setSectionSaveError("Network error updating section.");
    } finally {
      setIsSavingSection(false);
    }
  }

  // Sync with current authenticated user & section details
  useEffect(() => {
    async function initUserData() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role) {
            setCurrentUserRole(data.user.role);
          }
          if (data.user?.studentAcademicDetails?.currentCourseYear) {
            const yr = data.user.studentAcademicDetails.currentCourseYear;
            if (yr === 1) setUserYearText("1st Year");
            else if (yr === 2) setUserYearText("2nd Year");
            else if (yr === 3) setUserYearText("3rd Year");
            else if (yr === 4) setUserYearText("4th Year");
          }
          if (data.user?.section) {
            setCurrentSection(data.user.section);
            setSectionInputValue(data.user.section);
          } else {
            setCurrentSection("");
            setSectionInputValue("");
          }
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

      // Fetch section endpoint for authoritative status
      try {
        const secRes = await fetch("/api/campus/section");
        if (secRes.ok) {
          const secData = await secRes.json();
          if (secData.section) {
            setCurrentSection(secData.section);
            setSectionInputValue(secData.section);
          } else {
            setCurrentSection("");
            setSectionInputValue("");
          }
        }
      } catch {
        // silent
      }
    }
    initUserData();
  }, []);

  // Load campus details, faculties, subjects, calendars, and schedules strictly from Database
  useEffect(() => {
    async function loadCampusData() {
      if (!campusInfo.id) return;
      try {
        const [campusRes, scheduleRes] = await Promise.all([
          fetch(`/api/campuses/${campusInfo.id}`, { cache: "no-store" }),
          fetch(`/api/campus/schedule?campusId=${campusInfo.id}`, { cache: "no-store" }),
        ]);

        if (campusRes.ok) {
          const data = await campusRes.json();
          if (data.campus) {
            setCampusInfo((prev) => ({
              ...prev,
              name: data.campus.name || prev.name,
              universityName: data.campus.universityName || prev.universityName,
              facilities: data.campus.facilities || prev.facilities,
              address: data.campus.address || prev.address,
            }));

            // 1. Faculties from Database
            if (Array.isArray(data.campus.faculties)) {
              setFaculties(
                data.campus.faculties.map((f: any) => ({
                  id: f.id,
                  name: f.name,
                  designation: f.designation,
                  department: f.department,
                  email: f.email,
                  phone: f.phone,
                  officeRoom: f.officeRoom,
                })),
              );
            }

            // 2. Subjects from Database
            if (Array.isArray(data.campus.subjects)) {
              const subs: SemesterSubjectItem[] = data.campus.subjects.map((s: any) => ({
                id: s.id,
                name: s.name,
                code: s.code || "",
                credits: s.credits ?? 3,
                type: s.type || "Theory",
                handledBy: s.handledBy === "University" ? "University" : "NIAT",
                description: s.syllabus || `${s.name} Curriculum`,
                faculty: s.teachingFacultyNames?.[0] || s.hodName || undefined,
                mentor: s.mentorFacultyNames?.[0] || undefined,
                questionBankUrl: s.questionBankUrl || undefined,
              }));
              setCoursesList(subs);
            }

            // 3. Calendars & Events from Database
            if (Array.isArray(data.campus.calendars)) {
              const cals = data.campus.calendars.map((c: any) => {
                const d = new Date(c.eventDate);
                const semester: "ODD" | "EVEN" = d < new Date("2027-02-01") ? "ODD" : "EVEN";
                const isHoliday = checkIsHoliday(c.title, c.eventType);
                return {
                  id: c.id,
                  rawDate: c.eventDate,
                  monthShort: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                  monthLong: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                  dateFormatted: d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  dayNumber: d.getDate(),
                  semester,
                  milestone: c.title,
                  eventType: c.eventType,
                  isHoliday,
                  description: c.description,
                };
              });
              setAcademicCalendar(cals);

              // Upcoming Events: Strictly Real Management Events & Club Events (No academic milestones/marks freezing)
              const events = data.campus.calendars
                .filter((c: any) => {
                  const evType = (c.eventType || "").toUpperCase();
                  return (
                    evType === "MANAGEMENT_EVENT" ||
                    evType === "CLUB_EVENT" ||
                    evType === "FEST" ||
                    evType === "WORKSHOP" ||
                    evType.startsWith("CLUB_")
                  );
                })
                .map((c: any) => {
                  const d = new Date(c.eventDate);
                  const isHoliday = checkIsHoliday(c.title, c.eventType);
                  const isManagement =
                    c.eventType === "MANAGEMENT_EVENT" ||
                    c.eventType === "fest" ||
                    c.eventType === "workshop" ||
                    c.eventType === "FEST" ||
                    c.eventType === "WORKSHOP";

                  let venue = "Main Campus";
                  let link: string | null = null;
                  let details = c.description || "";
                  if (c.description) {
                    const parts = c.description.split(" | ");
                    for (const p of parts) {
                      if (p.startsWith("Venue: ")) venue = p.replace("Venue: ", "");
                      else if (p.startsWith("Link: ")) link = p.replace("Link: ", "");
                      else if (p.startsWith("Details: ")) details = p.replace("Details: ", "");
                    }
                  }

                  return {
                    id: c.id,
                    title: c.title,
                    rawDate: c.eventDate,
                    date: d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                    timeFormatted: d.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    monthLong: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                    type: (isManagement ? "MANAGEMENT" : "CLUB") as "MANAGEMENT" | "CLUB",
                    source: isManagement ? "Management Event" : "Club Event",
                    location: venue,
                    link,
                    details,
                    isLive: d.toDateString() === new Date().toDateString(),
                    isHoliday,
                  };
                });
              setUpcomingEvents(events);
            }
          }
        }

        // 4. IA Exams, CIA Schedules, Skill Assessments, SEE strictly from Database
        let rawIa: any[] = [];
        let rawCia: any[] = [];
        let rawSa: any[] = [];
        let rawSee: any[] = [];

        if (scheduleRes.ok) {
          try {
            const sData = await scheduleRes.json();
            if (Array.isArray(sData.ia) && sData.ia.length > 0) rawIa = sData.ia;
            if (Array.isArray(sData.cia) && sData.cia.length > 0) rawCia = sData.cia;
            if (Array.isArray(sData.sa) && sData.sa.length > 0) rawSa = sData.sa;
            if (Array.isArray(sData.see) && sData.see.length > 0) rawSee = sData.see;
          } catch {
            // fallback below
          }
        }

        // Fallback to campus details payload if schedule endpoint returned empty
        if (rawIa.length === 0 && campusRes.ok) {
          try {
            const cData = await campusRes.clone().json();
            if (Array.isArray(cData?.campus?.iaExams)) rawIa = cData.campus.iaExams;
            if (Array.isArray(cData?.campus?.ciaSchedules)) rawCia = cData.campus.ciaSchedules;
          } catch {
            // ignore
          }
        }

        if (rawIa.length > 0) {
          const mappedIa: IaEntry[] = rawIa.map((e: any) => {
            const d = new Date(e.scheduledAt);
            const hours = d.getHours();
            const sessionVal: "FN" | "AF" = hours < 12 ? "FN" : "AF";
            return {
              id: e.id,
              iaNumber: (e.examType === "IA-1" ? "IA 1" : "IA 2") as "IA 1" | "IA 2",
              subject: e.subject,
              code:
                e.code ||
                (e.subject.includes("BTNX")
                  ? e.subject.match(/BTNX\d+/)?.[0] || ""
                  : e.subject.includes("SVY")
                    ? "SVY301"
                    : ""),
              date: d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              time: d.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              session: sessionVal,
              handledBy:
                e.subject.toLowerCase().includes("yoga") ||
                e.subject.toLowerCase().includes("university")
                  ? "University"
                  : "NIAT",
              isTentative: Boolean(e.isTentative),
              syllabusTopics: e.syllabus
                ? e.syllabus
                    .split(/[,\n]/)
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : e.notes
                  ? [e.notes]
                  : [],
              questionBankUrl: e.questionBankUrl || undefined,
            };
          });
          setIaExams(mappedIa);
          if (mappedIa.length > 0 && !mappedIa.some((m) => m.code === selectedIaSubjectCode)) {
            setSelectedIaSubjectCode(mappedIa[0].code);
          }
        } else {
          setIaExams([]);
        }

        // 5. Skill Assessment (NIAT Core 6 subjects conducted on a single day)
        if (rawSa.length > 0) {
          const mappedSa: IaEntry[] = rawSa.map((e: any) => {
            const d = new Date(e.scheduledAt);
            const isSa1 = e.examType === "SKILL-ASSESSMENT-1" || e.examType?.includes("1");
            return {
              id: e.id,
              iaNumber: isSa1 ? "SA 1" : "SA 2",
              examType: e.examType,
              subject: e.subject,
              code:
                e.code || (e.subject.includes("BTNX") ? e.subject.match(/BTNX\d+/)?.[0] || "" : ""),
              date: d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              time: d.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              session: "FN" as const,
              handledBy: "NIAT" as const,
              isTentative: Boolean(e.isTentative),
              syllabusTopics: e.syllabus
                ? e.syllabus
                    .split(/[,\n]/)
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : e.notes
                  ? [e.notes]
                  : [],
              questionBankUrl: e.questionBankUrl || undefined,
              venue: e.venue || undefined,
            };
          });
          setSaExams(mappedSa);
          if (mappedSa.length > 0 && !mappedSa.some((m) => m.code === selectedSaSubjectCode)) {
            setSelectedSaSubjectCode(mappedSa[0].code);
          }
        } else {
          setSaExams([]);
        }

        // 6. Semester End Exams (SEE)
        if (rawSee.length > 0) {
          const mappedSee: IaEntry[] = rawSee.map((e: any) => {
            const d = new Date(e.scheduledAt);
            const hours = d.getHours();
            return {
              id: e.id,
              iaNumber: "IA 1" as const,
              subject: e.subject,
              code:
                e.code ||
                (e.subject.includes("BTNX")
                  ? e.subject.match(/BTNX\d+/)?.[0] || ""
                  : e.subject.includes("SVY")
                    ? "SVY301"
                    : ""),
              date: d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              time: d.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              session: hours < 12 ? ("FN" as const) : ("AF" as const),
              handledBy:
                e.subject.toLowerCase().includes("yoga") ||
                e.subject.toLowerCase().includes("university")
                  ? "University"
                  : "NIAT",
              isTentative: Boolean(e.isTentative),
              syllabusTopics: e.syllabus
                ? e.syllabus
                    .split(/[,\n]/)
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : e.notes
                  ? [e.notes]
                  : [],
              questionBankUrl: e.questionBankUrl || undefined,
            };
          });
          setSeeExams(mappedSee);
          if (mappedSee.length > 0 && !mappedSee.some((m) => m.code === selectedSeeSubjectCode)) {
            setSelectedSeeSubjectCode(mappedSee[0].code);
          }
        } else {
          setSeeExams([]);
        }

        if (rawCia.length > 0) {
          const mappedCia: CiaEntry[] = rawCia.map((c: any) => {
            const d = new Date(c.scheduledAt);
            return {
              id: c.id,
              ciaNumber: (c.component.includes("1")
                ? "CIA 1"
                : c.component.includes("2")
                  ? "CIA 2"
                  : "CIA 3") as "CIA 1" | "CIA 2" | "CIA 3",
              subject: c.subject,
              code: c.code || "",
              topic: c.topic || c.notes || undefined,
              submissionDate: d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              status: (c.status || "PENDING") as "SUBMITTED" | "PENDING" | "EXTENDED",
              handledBy: "NIAT",
            };
          });
          setCiaAssessments(mappedCia);
          if (mappedCia.length > 0 && !mappedCia.some((m) => m.code === selectedCiaSubjectCode)) {
            setSelectedCiaSubjectCode(mappedCia[0].code);
          }
        } else {
          setCiaAssessments([]);
        }
      } catch (err) {
        console.error("Error loading campus database data:", err);
      }
    }
    loadCampusData();
  }, [campusInfo.id]);

  // Load official campus notifications
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/campus/alerts");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.alerts) && data.alerts.length > 0) {
            const apiAlerts: CampusNotificationItem[] = data.alerts.map(
              (alert: {
                id: string;
                title: string;
                body?: string;
                severity?: string;
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

  // Dynamic Live Alerts & Countdown Ticker derived from database notifications and upcoming exams
  const liveNewsTicker = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      newDate: string;
      urgent: boolean;
      countdown: string;
      category: string;
    }> = [];

    // From official database notifications
    notifications.forEach((n) => {
      items.push({
        id: n.id,
        title: n.title,
        newDate: n.timestamp,
        urgent: n.category === "URGENT",
        countdown: n.tag,
        category: n.category,
      });
    });

    // From upcoming IA exams in database
    iaExams.slice(0, 3).forEach((exam) => {
      items.push({
        id: `ticker-ia-${exam.id}`,
        title: `${exam.subject} (${exam.code}) - ${exam.iaNumber}`,
        newDate: `${exam.date} at ${exam.time}`,
        urgent: !exam.isTentative,
        countdown: exam.isTentative ? "Tentative Schedule" : "Confirmed",
        category: "EXAMINATION",
      });
    });

    return items;
  }, [notifications, iaExams]);

  // Auto-cycle live ticker in right division
  useEffect(() => {
    if (liveNewsTicker.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTickerIndex((prev) => (prev + 1) % liveNewsTicker.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [liveNewsTicker.length]);

  // Filtered CIA Assessments for active CIA tab
  const filteredCiaAssessments = useMemo(() => {
    return ciaAssessments.filter((item) => item.ciaNumber === activeCiaTab);
  }, [ciaAssessments, activeCiaTab]);

  const selectedCiaItem = useMemo(() => {
    return (
      filteredCiaAssessments.find((c) => c.code === selectedCiaSubjectCode) ||
      filteredCiaAssessments[0] ||
      null
    );
  }, [filteredCiaAssessments, selectedCiaSubjectCode]);

  // Filtered IA Exams for active IA tab
  const filteredIaExams = useMemo(() => {
    return iaExams.filter((exam) => exam.iaNumber === activeIaTab);
  }, [iaExams, activeIaTab]);

  const selectedIaExam = useMemo(() => {
    return (
      filteredIaExams.find((e) => e.code === selectedIaSubjectCode) || filteredIaExams[0] || null
    );
  }, [filteredIaExams, selectedIaSubjectCode]);

  // Filtered Skill Assessment by Tab (SA 2 vs SA 1)
  const filteredSaExams = useMemo(() => {
    return saExams.filter((e) => {
      const isSa1 = e.examType?.includes("1") || e.iaNumber === "SA 1";
      return activeSaTab === "SA 1" ? isSa1 : !isSa1;
    });
  }, [saExams, activeSaTab]);

  // Selected Skill Assessment subject
  const selectedSaExam = useMemo(() => {
    return (
      filteredSaExams.find((e) => e.code === selectedSaSubjectCode) || filteredSaExams[0] || null
    );
  }, [filteredSaExams, selectedSaSubjectCode]);

  // Selected Semester End Exam subject
  const selectedSeeExam = useMemo(() => {
    return seeExams.find((e) => e.code === selectedSeeSubjectCode) || seeExams[0] || null;
  }, [seeExams, selectedSeeSubjectCode]);

  // Auto-scroll present month into center when academic calendar modal opens
  useEffect(() => {
    if (isCalendarModalOpen) {
      const timer = setTimeout(() => {
        if (currentMonthRef.current) {
          currentMonthRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isCalendarModalOpen]);

  // Grouped Academic Calendar (Odd Semester & Even Semester sections, Month boxes, Holidays filter)
  const groupedCalendar = useMemo(() => {
    const now = new Date();
    const currentMonthLong = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const filtered =
      calendarTab === "HOLIDAYS" ? academicCalendar.filter((e) => e.isHoliday) : academicCalendar;

    const oddEvents = filtered.filter((e) => e.semester === "ODD");
    const evenEvents = filtered.filter((e) => e.semester === "EVEN");

    function groupIntoMonths(events: typeof academicCalendar) {
      const map = new Map<string, typeof academicCalendar>();
      for (const ev of events) {
        const key = ev.monthLong;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
      return Array.from(map.entries()).map(([month, evList]) => {
        const isCurrentMonth =
          month.toLowerCase() === currentMonthLong.toLowerCase() ||
          (month.toLowerCase().includes("november") && month.includes("2026"));
        return {
          month,
          isCurrentMonth,
          events: evList,
        };
      });
    }

    return {
      oddMonths: groupIntoMonths(oddEvents),
      evenMonths: groupIntoMonths(evenEvents),
    };
  }, [academicCalendar, calendarTab]);

  // Grouped Upcoming Events by Month box with All Events vs Holidays filter
  const groupedUpcomingEvents = useMemo(() => {
    const now = new Date();
    const currentMonthLong = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const filtered =
      upcomingEventsTab === "MANAGEMENT"
        ? upcomingEvents.filter(
            (e) => e.type === "MANAGEMENT" || (e.source && e.source.includes("Management")),
          )
        : upcomingEventsTab === "CLUBS"
          ? upcomingEvents.filter(
              (e) => e.type === "CLUB" || (e.source && e.source.includes("Club")),
            )
          : upcomingEvents;

    const map = new Map<string, typeof upcomingEvents>();
    for (const ev of filtered) {
      const key = ev.monthLong || "Upcoming";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }

    return Array.from(map.entries()).map(([month, evList]) => {
      const isCurrentMonth =
        month.toLowerCase() === currentMonthLong.toLowerCase() ||
        (month.toLowerCase().includes("november") && month.includes("2026"));
      return {
        month,
        isCurrentMonth,
        events: evList,
      };
    });
  }, [upcomingEvents, upcomingEventsTab]);

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
      {/* ── MAIN TWO-COLUMN CONTENT GRID (Per Wireframe) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ══════════════════════════════════════════════════════════════
            LEFT DIVISION (lg:col-span-7):
            1. Top Card: College Name & Year | Sec
            2. Row of 3 Cards: CIA, IA, Courses
            3. Active Module Detail (CIA / IA / Courses)
            4. Full-Width Poll Card:
               - Sub-sections: General Poll & Complaint Poll
               - Inside Complaint Poll: 2 filters: Campus & Section
               - Continuously scrollable like home page feed!
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-6 w-full pr-0 lg:pr-2">
          {/* ── 1. COLLEGE NAME & YEAR / SEC CARD (Per Wireframe) ── */}
          <div className="w-full bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                  {campusInfo.name || "Campus Community"}
                </h1>
              </div>
            </div>

            {/* Section & Year: "2nd Year | Sec 1" or "Sec" if not assigned by campus admin */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wide">
                  {currentSection && currentSection.trim().length > 0
                    ? `${userYearText ? `${userYearText} | ` : ""}${currentSection}`
                    : `${userYearText ? `${userYearText} | ` : ""}Sec`}
                </span>
              </div>

              {isCampusAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setSectionInputValue(currentSection);
                    setSectionSaveError(null);
                    setIsEditSectionModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                  title="Assign / Edit Section Details (Campus Admin Only)"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── 2. ROW OF 4 BUTTONS: CIA, SKILL ASSESSMENTS, IA, SEMESTER END EXAMS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. CIA */}
            <button
              type="button"
              onClick={() => setIsCiaModalOpen(true)}
              className="p-3.5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-2xs hover:shadow-md transition-all cursor-pointer text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  CIA 1, 2, 3
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">CIA</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Continuous Assessments
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>

            {/* 2. Skill Assessments */}
            <button
              type="button"
              onClick={() => setIsSaModalOpen(true)}
              className="p-3.5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 shadow-2xs hover:shadow-md transition-all cursor-pointer text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  6 Courses
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Skill Assessments
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Single-Day Evaluation
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>

            {/* 3. IA */}
            <button
              type="button"
              onClick={() => setIsIaModalOpen(true)}
              className="p-3.5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-2xs hover:shadow-md transition-all cursor-pointer text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  IA 1 & IA 2
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">IA</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Examination Timetable
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>

            {/* 4. Semester End Exams */}
            <button
              type="button"
              onClick={() => setIsSeeModalOpen(true)}
              className="p-3.5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs hover:shadow-md transition-all cursor-pointer text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  SEE Exams
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Semester End
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    SEE Timetable & Regs
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              2. POLL CARD IN LEFT DIVISION (Per Wireframe)
              Sub-sections: General Poll & Complaint Poll
              Inside Complaint Poll: 2 filters: Campus & Section
              ══════════════════════════════════════════════════════════════ */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-800/60 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    Polls
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Participate in campus ballots, facility feedbacks, and grievances.
                  </p>
                </div>
              </div>

              {/* Sub-sections tabs: General Poll | Complaint Poll */}
              <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActivePollSubSection("GENERAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePollSubSection === "GENERAL"
                      ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  General Poll
                </button>
                <button
                  type="button"
                  onClick={() => setActivePollSubSection("COMPLAINT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePollSubSection === "COMPLAINT"
                      ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Complaint Poll</span>
                </button>
              </div>
            </CardHeader>

            {/* ── SUB-SECTION 1: GENERAL POLL ── */}
            {activePollSubSection === "GENERAL" && (
              <div className="p-4 space-y-4">
                {(liveGeneralPolls.length > 0 ? liveGeneralPolls : campusPolls).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    No active campus polls.
                  </div>
                ) : (
                  (
                    (liveGeneralPolls.length > 0
                      ? liveGeneralPolls
                      : campusPolls) as unknown as RenderablePollItem[]
                  ).map((poll: RenderablePollItem) => {
                    const isLive = Boolean(poll.postId);
                    const hasVoted = isLive ? poll.hasVoted : Boolean(userVotedPolls[poll.id]);
                    const userSelectedIds = isLive
                      ? poll.userSelectedOptionIds || []
                      : [userVotedPolls[poll.id]];

                    return (
                      <div
                        key={poll.id}
                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                      >
                        <PollCreatorHeader
                          authorName={poll.authorName || "Campus Academic Dean"}
                          authorUsername={poll.authorUsername}
                          authorAvatarUrl={poll.authorAvatarUrl}
                          authorRole={poll.authorRole || "FACULTY"}
                          authorCampus={poll.authorCampus || { name: campusInfo.name }}
                          createdAt={poll.createdAt}
                          isAnonymous={poll.isAnonymous}
                          onReport={
                            isLive && poll.postId
                              ? () => {
                                  if (poll.postId) setReportingPollPostId(poll.postId);
                                }
                              : undefined
                          }
                        />

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {poll.scope || poll.category || "Campus Poll"}
                          </span>
                          <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug text-xs sm:text-sm">
                            {poll.question}
                          </p>
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                          {poll.options.map((opt: RenderablePollOption) => {
                            const isSubmitted = userSelectedIds.includes(opt.id);
                            const percent = opt.percent ?? opt.pct ?? 0;
                            const label = opt.text ?? opt.label;
                            const votes = opt.votes ?? 0;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={hasVoted || votingPollId === poll.id}
                                onClick={() => {
                                  if (hasVoted) return;
                                  if (isLive) {
                                    void handleVoteLivePoll(poll.id, opt.id);
                                  } else {
                                    handleVoteGeneralPoll(poll.id, opt.id);
                                  }
                                }}
                                className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all relative overflow-hidden ${
                                  hasVoted
                                    ? isSubmitted
                                      ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 font-bold text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500"
                                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 opacity-90"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                                }`}
                              >
                                {hasVoted && (
                                  <div
                                    className="absolute inset-y-0 left-0 bg-indigo-100/70 dark:bg-indigo-900/40 transition-all duration-700"
                                    style={{ width: `${percent}%` }}
                                  />
                                )}

                                <div className="relative flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0 pr-1">
                                    {!hasVoted && (
                                      <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0" />
                                    )}
                                    <span>{label}</span>
                                  </div>

                                  {hasVoted && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isSubmitted && (
                                        <span className="text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-200/70 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                                          Your Vote
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {percent}% ({votes})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <span>{poll.totalVotes} campus votes recorded</span>
                            {isLive && (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenCommentPollIds((prev) => ({
                                    ...prev,
                                    [poll.id]: !prev[poll.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>{poll.commentCount ?? 0} comments</span>
                              </button>
                            )}
                          </div>
                          {poll.closesAt && (
                            <span>
                              Closes{" "}
                              {new Date(poll.closesAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>

                        {isLive && poll.postId && (
                          <PollCommentSection
                            postId={poll.postId}
                            isOpen={Boolean(openCommentPollIds[poll.id])}
                            isGuest={currentUserRole === "GUEST"}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── SUB-SECTION 2: COMPLAINT POLL (With General, Campus, Batch, Section Filter Tabs & Info) ── */}
            {activePollSubSection === "COMPLAINT" && (
              <div>
                {/* Filter Scope & Info Button */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                      Scope:
                    </span>
                    {(
                      [
                        { id: "ALL", label: "All" },
                        { id: "GENERAL", label: "General" },
                        { id: "CAMPUS", label: "Campus" },
                        { id: "BATCH", label: "Batch" },
                        { id: "SECTION", label: "Section" },
                      ] as const
                    ).map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setActiveComplaintFilter(lvl.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeComplaintFilter === lvl.id
                            ? "bg-rose-600 text-white shadow-2xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}

                    {/* Calculation Info Button (i) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowComplaintInfoTooltip(!showComplaintInfoTooltip)}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Calculation rule info"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                      {showComplaintInfoTooltip && (
                        <div className="absolute left-0 sm:left-auto top-full mt-1.5 w-68 bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-2xl z-50 border border-slate-700 leading-relaxed space-y-1.5">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800 font-bold">
                            <span className="text-cyan-400">Calculation Rules</span>
                            <button
                              type="button"
                              onClick={() => setShowComplaintInfoTooltip(false)}
                              className="text-slate-400 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                          <p>
                            • <b>Section Level:</b> % calculated against total students enrolled in
                            the section.
                          </p>
                          <p>
                            • <b>Batch Level:</b> % calculated against total students enrolled in
                            the batch.
                          </p>
                          <p>
                            • <b>Campus Level:</b> % calculated against total students enrolled in
                            the campus.
                          </p>
                          <p>
                            • <b>General Complaints:</b> % calculated based on total users who
                            answered the poll.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-full">
                    {
                      (liveComplaintPolls.length > 0 ? liveComplaintPolls : filteredComplaintPolls)
                        .length
                    }{" "}
                    Complaints Active
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {(liveComplaintPolls.length > 0 ? liveComplaintPolls : filteredComplaintPolls)
                    .length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                      No active complaint polls.
                    </div>
                  ) : (
                    (
                      (liveComplaintPolls.length > 0
                        ? liveComplaintPolls
                        : filteredComplaintPolls) as unknown as RenderablePollItem[]
                    ).map((cp: RenderablePollItem) => {
                      const isLive = Boolean(cp.postId);
                      const hasVoted = isLive ? cp.hasVoted : Boolean(userVotedPolls[cp.id]);
                      const userSelectedIds = isLive
                        ? cp.userSelectedOptionIds || []
                        : [userVotedPolls[cp.id]];

                      return (
                        <div
                          key={cp.id}
                          className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-950 bg-rose-50/20 dark:bg-slate-900 shadow-2xs space-y-3"
                        >
                          <PollCreatorHeader
                            authorName={cp.authorName || "Student Representative"}
                            authorUsername={cp.authorUsername}
                            authorAvatarUrl={cp.authorAvatarUrl}
                            authorRole={cp.authorRole || "STUDENT"}
                            authorCampus={cp.authorCampus || { name: campusInfo.name }}
                            createdAt={cp.createdAt || new Date().toISOString()}
                            isAnonymous={cp.isAnonymous ?? true}
                            onReport={
                              isLive && cp.postId
                                ? () => {
                                    if (cp.postId) setReportingPollPostId(cp.postId);
                                  }
                                : undefined
                            }
                          />

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              {cp.complaintLevel === "SECTION"
                                ? `${cp.section || currentSection || "Section"} Grievance`
                                : cp.complaintLevel === "BATCH"
                                  ? `${cp.batch ? `Batch ${cp.batch}` : "Batch"} Grievance`
                                  : cp.complaintLevel === "CAMPUS"
                                    ? "Campus Grievance"
                                    : "General Grievance"}
                            </span>

                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                              Active Ballot
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 leading-snug">
                            {cp.question}
                          </h4>

                          {/* Options */}
                          <div className="space-y-1.5 pt-1">
                            {cp.options.map((opt: RenderablePollOption) => {
                              const isChosen = userSelectedIds.includes(opt.id);
                              const percent = opt.percent ?? opt.pct ?? 0;
                              const label = opt.text ?? opt.label;
                              const votes = opt.votes ?? 0;

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={hasVoted || votingPollId === cp.id}
                                  onClick={() => {
                                    if (hasVoted) return;
                                    if (isLive) {
                                      void handleVoteLivePoll(cp.id, opt.id);
                                    } else {
                                      handleVoteComplaintPoll(cp.id, opt.id);
                                    }
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all relative overflow-hidden ${
                                    hasVoted
                                      ? isChosen
                                        ? "border-rose-600 bg-rose-50/70 dark:bg-rose-950/60 font-bold text-rose-950 dark:text-rose-200 ring-1 ring-rose-500"
                                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                                  }`}
                                >
                                  {hasVoted && (
                                    <div
                                      className="absolute inset-y-0 left-0 bg-rose-100/70 dark:bg-rose-900/40 transition-all duration-700"
                                      style={{ width: `${percent}%` }}
                                    />
                                  )}

                                  <div className="relative flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {!hasVoted && (
                                        <div className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                      )}
                                      <span>{label}</span>
                                    </div>
                                    {hasVoted && (
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                        {percent}% ({votes})
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {hasVoted &&
                            cp.calculationBasis === "TOTAL_STUDENTS" &&
                            cp.totalTargetStudents && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic text-right">
                                * % calculated against {cp.totalTargetStudents} total students in
                                this {cp.complaintLevel?.toLowerCase()}
                              </p>
                            )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                            <div className="flex items-center gap-3">
                              <span>{cp.totalVotes} student responses</span>
                              {isLive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenCommentPollIds((prev) => ({
                                      ...prev,
                                      [cp.id]: !prev[cp.id],
                                    }))
                                  }
                                  className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{cp.commentCount ?? 0} comments</span>
                                </button>
                              )}
                            </div>
                            {cp.closesAt && (
                              <span>
                                Closes{" "}
                                {new Date(cp.closesAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>

                          {isLive && cp.postId && (
                            <PollCommentSection
                              postId={cp.postId}
                              isOpen={Boolean(openCommentPollIds[cp.id])}
                              isGuest={currentUserRole === "GUEST"}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT DIVISION (lg:col-span-5):
            1. Academic Calendar & Campus Faculty (Per Wireframe)
            2. Live campus news slide show (Live campus ticker)
            3. Campus notifications
            4. Upcoming Campus events and academic milestones (WITHOUT "Active" badge)
            - Sticky, independent scrolling!
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto overscroll-contain pr-0 lg:pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {/* ── 1. ACADEMIC CALENDAR, CAMPUS FACULTY & COURSES (Per Wireframe) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Academic Calendar Button */}
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="w-full flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-purple-600/15 hover:shadow-lg hover:shadow-purple-600/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-purple-400/20 group"
            >
              <div className="h-8 w-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="text-left flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                    Academic Calendar
                  </span>
                  <span className="text-[9px] font-black bg-white/20 text-white px-1.5 py-0.2 rounded-full">
                    2026–27
                  </span>
                </div>
                <p className="text-[10px] text-indigo-100 font-medium truncate">Schedule & Exams</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Campus Faculty Button */}
            <button
              type="button"
              onClick={() => setIsFacultyModalOpen(true)}
              className="w-full flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-md shadow-indigo-600/15 hover:shadow-lg hover:shadow-indigo-600/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-indigo-400/20 group"
            >
              <div className="h-8 w-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-left flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                    Campus Faculty
                  </span>
                  <span className="text-[9px] font-black bg-white/20 text-white px-1.5 py-0.2 rounded-full">
                    {faculties.length}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-100 font-medium truncate">Mentors & Cabins</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Courses Button */}
            <button
              type="button"
              onClick={() => setIsCoursesModalOpen(true)}
              className="w-full flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-600/15 hover:shadow-lg hover:shadow-emerald-600/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-emerald-400/20 group"
            >
              <div className="h-8 w-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="text-left flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                    Courses
                  </span>
                  <span className="text-[9px] font-black bg-white/20 text-white px-1.5 py-0.2 rounded-full">
                    {coursesList.length || 7} Subs
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100 font-medium truncate">
                  Curriculum & Credits
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>

          {/* ── 2. LIVE CAMPUS NEWS SLIDE SHOW ── */}
          <Card className="border-slate-200/90 shadow-sm overflow-hidden">
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 p-0.5">
              {liveNewsTicker.length === 0 ? (
                <div className="rounded-[14px] bg-slate-950 text-white p-5 text-center text-xs text-slate-400">
                  No active campus announcements or exam schedules published yet.
                </div>
              ) : (
                <div className="rounded-[14px] bg-slate-950 text-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                        Live Campus News Slide Show
                      </span>
                    </div>

                    <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      {liveNewsTicker[activeTickerIndex]?.countdown}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-black leading-snug">
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
              )}
            </div>
          </Card>

          {/* ── 2. CAMPUS NOTIFICATIONS ── */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-800/60 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Campus Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {unreadNotificationsCount} New
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Official circulars, deadline alerts, and updates.
                  </p>
                </div>
              </div>

              {/* Notification Filter Pills */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg self-start sm:self-auto text-[10px]">
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
                        ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3.5 space-y-2.5 max-h-[380px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No updates in this category.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all shadow-2xs space-y-1.5 ${
                      notif.unread
                        ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            notif.category === "URGENT"
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : notif.category === "ACADEMIC" || notif.category === "EXAM"
                                ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                : notif.category === "EVENT"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {notif.tag}
                        </span>

                        {notif.unread && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {notif.timestamp}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {notif.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400 dark:text-slate-500">By:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          {notif.author}
                        </span>
                      </span>

                      {notif.category === "URGENT" && (
                        <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
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

          {/* ── 3. UPCOMING EVENTS & ACADEMIC MILESTONES (WITH MONTH BOXES & HOLIDAYS SUB-SECTION) ── */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-800/60 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Upcoming Events</span>
              </CardTitle>

              {/* Tabs: All Events vs Management vs Clubs */}
              <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg self-start sm:self-auto text-[10px]">
                <button
                  type="button"
                  onClick={() => setUpcomingEventsTab("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    upcomingEventsTab === "ALL"
                      ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setUpcomingEventsTab("MANAGEMENT")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    upcomingEventsTab === "MANAGEMENT"
                      ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>🏛️ Management</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpcomingEventsTab("CLUBS")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    upcomingEventsTab === "CLUBS"
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>🎯 Clubs</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 space-y-3 max-h-[480px] overflow-y-auto">
              {groupedUpcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {upcomingEventsTab === "MANAGEMENT"
                      ? "No management events scheduled yet."
                      : upcomingEventsTab === "CLUBS"
                        ? "No club events scheduled yet."
                        : "No upcoming campus events scheduled yet."}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    {upcomingEventsTab === "MANAGEMENT"
                      ? "Campus management will publish fests, workshops, and placement drives here."
                      : upcomingEventsTab === "CLUBS"
                        ? "Club presidents will schedule tournaments and activities here."
                        : "Events arranged by campus management and club presidents will appear here."}
                  </p>
                </div>
              ) : (
                groupedUpcomingEvents.map((mGroup) => (
                  <div
                    key={mGroup.month}
                    className={`p-3 rounded-2xl border transition-all ${
                      mGroup.isCurrentMonth
                        ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-500/30 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    {/* Month Box Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            mGroup.isCurrentMonth
                              ? "bg-indigo-600 dark:bg-indigo-400 animate-pulse"
                              : "bg-slate-400 dark:bg-slate-500"
                          }`}
                        />
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {mGroup.month}
                        </h4>
                      </div>
                      {mGroup.isCurrentMonth && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-indigo-600 text-white">
                          Current Month
                        </span>
                      )}
                    </div>

                    {/* Events inside this Month Box */}
                    <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                      {mGroup.events.map((ev) => (
                        <div key={ev.id} className="pt-2.5 first:pt-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs leading-snug text-slate-900 dark:text-slate-100 font-bold">
                              {ev.title}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                ev.type === "MANAGEMENT"
                                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                  : "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              }`}
                            >
                              {ev.source || (ev.type === "MANAGEMENT" ? "Management" : "Club")}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span>
                                {ev.date} {ev.timeFormatted ? `• ${ev.timeFormatted}` : ""}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                              <span className="line-clamp-1">{ev.location}</span>
                            </span>
                          </div>

                          {ev.details && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {ev.details}
                            </p>
                          )}

                          {ev.link && (
                            <div className="pt-0.5">
                              <a
                                href={ev.link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                <span>Register / Learn More</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECTION EDIT MODAL (Campus Admin Only) ── */}
      {isCampusAdmin && (
        <Modal
          open={isEditSectionModalOpen}
          onClose={() => setIsEditSectionModalOpen(false)}
          title="Edit Section Details"
          description="Update student section assignment. Only Campus Administrators can modify this."
          className="max-w-md"
        >
          <form onSubmit={handleSaveSection} className="space-y-4 pt-2 text-xs">
            {sectionSaveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{sectionSaveError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Section Name / Identifier
              </label>
              <input
                type="text"
                required
                value={sectionInputValue}
                onChange={(e) => setSectionInputValue(e.target.value)}
                placeholder="e.g. Section A, Section B, Section C"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                This section tag will appear on the campus dashboard and route section-level
                complaint polls.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditSectionModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingSection || !sectionInputValue.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isSavingSection ? "Saving..." : "Save Section"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CIA MODAL (Continuous Internal Assessments) ── */}
      <Modal
        open={isCiaModalOpen}
        onClose={() => setIsCiaModalOpen(false)}
        title="Continuous Internal Assessments (CIA)"
        description="Assigned topics, guidelines, rubrics, and submission deadlines (CIA 1, 2, 3)."
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-y-auto max-h-[75vh] pr-1">
          {/* CIA Tabs & Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex bg-slate-200/80 dark:bg-slate-700 p-1 rounded-xl">
              {(["CIA 1", "CIA 2", "CIA 3"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCiaTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeCiaTab === tab
                      ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            {filteredCiaAssessments.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {filteredCiaAssessments.length} assessment
                {filteredCiaAssessments.length !== 1 ? "s" : ""} recorded
              </span>
            )}
          </div>

          {/* Subject Selection Pills */}
          {filteredCiaAssessments.length > 0 && (
            <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-850 flex flex-wrap gap-1.5 text-xs">
              {filteredCiaAssessments.map((item) => {
                const isSelected =
                  selectedCiaItem?.id === item.id || selectedCiaItem?.code === item.code;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCiaSubjectCode(item.code)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-700 dark:bg-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                        isSelected
                          ? "bg-indigo-800 dark:bg-indigo-700 text-indigo-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {item.code}
                    </span>
                    <span>{item.subject}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected CIA Detail */}
          {selectedCiaItem ? (
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {selectedCiaItem.code}
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      {selectedCiaItem.subject}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        selectedCiaItem.handledBy === "University"
                          ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300"
                      }`}
                    >
                      {selectedCiaItem.handledBy === "University"
                        ? "University Subject (S-VYASA)"
                        : "NIAT Main Subject"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                      selectedCiaItem.status === "SUBMITTED"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                        : selectedCiaItem.status === "EXTENDED"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {selectedCiaItem.status}
                  </span>

                  {isCampusAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingCiaItem(selectedCiaItem)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit CIA Assessment (Campus Admin only)"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Assignment Topic & Brief
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCiaItem.topic || "Practical assignment and rubrics evaluation"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Submission Due Date
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedCiaItem.submissionDate}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Max Marks & Weightage
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    20 Marks (Component of 50 CIA Total)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedResourceModal({
                      title: `${selectedCiaItem.code} - ${selectedCiaItem.subject} (${activeCiaTab} Guidelines)`,
                      type: "SYLLABUS",
                      content: [
                        `Topic: ${selectedCiaItem.topic || "Standard CIA Submission"}`,
                        "Strict adherence to university academic honesty policy",
                        "Submit report/code repo to department portal before due date",
                        "Viva-voce & presentation scheduled following week",
                      ],
                    })
                  }
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Rubrics & Guidelines</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
              No CIA assessment scheduled in the database.
            </div>
          )}
        </div>
      </Modal>

      {/* ── IA MODAL (Internal Assessment Examinations) ── */}
      <Modal
        open={isIaModalOpen}
        onClose={() => setIsIaModalOpen(false)}
        title="Internal Assessment Examinations (IA)"
        description="Semester examination timetable, syllabus coverage, paper formats, and room allocations."
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-y-auto max-h-[75vh] pr-1">
          {/* IA Tabs & Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/50">
            <div className="flex bg-slate-200/80 dark:bg-slate-700 p-1 rounded-xl">
              {(["IA 1", "IA 2"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveIaTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeIaTab === tab
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            {filteredIaExams.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {filteredIaExams.length} examination{filteredIaExams.length !== 1 ? "s" : ""}{" "}
                recorded
              </span>
            )}
          </div>

          {/* Subject Selection Pills */}
          {filteredIaExams.length > 0 && (
            <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-850 flex flex-wrap gap-1.5 text-xs">
              {filteredIaExams.map((exam) => {
                const isSelected =
                  selectedIaExam?.id === exam.id || selectedIaExam?.code === exam.code;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => setSelectedIaSubjectCode(exam.code)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-purple-700 dark:bg-purple-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                        isSelected
                          ? "bg-purple-800 dark:bg-purple-700 text-purple-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {exam.code}
                    </span>
                    <span>{exam.subject}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected IA Detail */}
          {selectedIaExam ? (
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {selectedIaExam.code}
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      {selectedIaExam.subject}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        selectedIaExam.handledBy === "University"
                          ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          : "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300"
                      }`}
                    >
                      {selectedIaExam.handledBy === "University"
                        ? "University Subject (S-VYASA)"
                        : "NIAT Main Subject"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      selectedIaExam.isTentative
                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                        : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                    }`}
                  >
                    {selectedIaExam.isTentative ? "Tentative Schedule" : "Confirmed"}
                  </span>

                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedIaExam.session === "FN" ? "Forenoon (FN)" : "Afternoon (AF)"}
                  </span>

                  {isCampusAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingIaExam(selectedIaExam)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit IA Examination details (Campus Admin only)"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Exam Date
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedIaExam.date}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Slot Time
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedIaExam.time}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedResourceModal({
                      title: `${selectedIaExam.code} - ${selectedIaExam.subject} (${selectedIaExam.iaNumber} Syllabus Topics)`,
                      type: "SYLLABUS",
                      content: selectedIaExam.syllabusTopics,
                    })
                  }
                  className="text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>View Syllabus Topics</span>
                </button>

                {selectedIaExam.questionBankUrl ? (
                  <a
                    href={selectedIaExam.questionBankUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 font-bold flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Question Bank</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">
                    Question bank not applicable / not uploaded
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
              No IA examination scheduled in the database.
            </div>
          )}
        </div>
      </Modal>

      {/* ── COURSES MODAL (Campus Curriculum & Subjects) ── */}
      <Modal
        open={isCoursesModalOpen}
        onClose={() => setIsCoursesModalOpen(false)}
        title="3rd Semester Curriculum Subjects (2025 Joined Batch)"
        description="Current semester course credits, department curriculum, syllabus, and course instructors."
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-y-auto max-h-[75vh] pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coursesList.length === 0 ? (
              <div className="col-span-full text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                No subjects registered in the database for this campus.
              </div>
            ) : (
              coursesList.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                        {sub.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            sub.handledBy === "University"
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {sub.handledBy === "University" ? "University Subject" : "NIAT Main"}
                        </span>

                        {isCampusAdmin && (
                          <button
                            type="button"
                            onClick={() => setEditingCourse(sub)}
                            className="p-0.5 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                            title="Edit Course details (Campus Admin only)"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {sub.name}
                    </h4>
                  </div>

                  {(sub.faculty || sub.mentor) && (
                    <div className="py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      {sub.faculty && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                            Faculty
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {sub.faculty}
                          </span>
                        </div>
                      )}
                      {sub.mentor && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                            Mentor
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {sub.mentor}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {sub.questionBankUrl && (
                    <div className="pt-1">
                      <a
                        href={sub.questionBankUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Question Bank Link</span>
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold">
                    <span>{sub.credits} Credits</span>
                    <span>{sub.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ── ACADEMIC CALENDAR MODAL (Opens when clicking Academic Calendar button) ── */}
      <Modal
        open={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title={`${campusInfo.universityName || campusInfo.name || "Campus"} Academic Calendar 2026–2027`}
        description="Official schedule for 2025-26 batch B.Tech CSE (3rd & 4th Semesters)."
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-hidden flex flex-col">
          {/* Top Filter Tabs: All Milestones vs Holidays */}
          <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCalendarTab("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calendarTab === "ALL"
                    ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                All Academic Milestones
              </button>
              <button
                type="button"
                onClick={() => setCalendarTab("HOLIDAYS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  calendarTab === "HOLIDAYS"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Holidays Section</span>
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pr-2 hidden sm:inline">
              Odd & Even Semesters
            </span>
          </div>

          {/* Calendar Content: Odd Semester followed by Even Semester, grouped by month */}
          <div className="overflow-y-auto max-h-[62vh] pr-1 space-y-6">
            {/* 1. SEMESTER ODD */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Semester Odd (3rd Sem: Aug 2026 – Jan 2027)
                </span>
              </div>

              {groupedCalendar.oddMonths.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No events recorded for Odd Semester.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedCalendar.oddMonths.map((mGroup) => (
                    <div
                      key={mGroup.month}
                      ref={mGroup.isCurrentMonth ? currentMonthRef : null}
                      className={`p-4 rounded-2xl border transition-all ${
                        mGroup.isCurrentMonth
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md"
                          : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Month Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              mGroup.isCurrentMonth
                                ? "bg-indigo-600 animate-pulse"
                                : "bg-slate-400 dark:bg-slate-500"
                            }`}
                          />
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            {mGroup.month}
                          </h4>
                        </div>
                        {mGroup.isCurrentMonth && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                            Current Month
                          </span>
                        )}
                      </div>

                      {/* Month Events */}
                      <div className="space-y-2 divide-y divide-slate-200/60 dark:divide-slate-700/40">
                        {mGroup.events.map((ev) => (
                          <div
                            key={ev.id}
                            className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shrink-0">
                                {ev.dateFormatted}
                              </span>
                              <span
                                className={`leading-snug ${
                                  ev.isHoliday
                                    ? "text-rose-600 dark:text-rose-400 font-bold"
                                    : "text-slate-800 dark:text-slate-200 font-medium"
                                }`}
                              >
                                {ev.milestone}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                ev.isHoliday
                                  ? "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  : ev.eventType === "exam"
                                    ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    : ev.eventType === "fest"
                                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {ev.isHoliday ? "Holiday" : ev.eventType || "Milestone"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. SEMESTER EVEN */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Semester Even (4th Sem: Feb 2027 – Jun 2027)
                </span>
              </div>

              {groupedCalendar.evenMonths.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No events recorded for Even Semester.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedCalendar.evenMonths.map((mGroup) => (
                    <div
                      key={mGroup.month}
                      ref={mGroup.isCurrentMonth ? currentMonthRef : null}
                      className={`p-4 rounded-2xl border transition-all ${
                        mGroup.isCurrentMonth
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md"
                          : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Month Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              mGroup.isCurrentMonth
                                ? "bg-indigo-600 animate-pulse"
                                : "bg-slate-400 dark:bg-slate-500"
                            }`}
                          />
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            {mGroup.month}
                          </h4>
                        </div>
                        {mGroup.isCurrentMonth && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                            Current Month
                          </span>
                        )}
                      </div>

                      {/* Month Events */}
                      <div className="space-y-2 divide-y divide-slate-200/60 dark:divide-slate-700/40">
                        {mGroup.events.map((ev) => (
                          <div
                            key={ev.id}
                            className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shrink-0">
                                {ev.dateFormatted}
                              </span>
                              <span
                                className={`leading-snug ${
                                  ev.isHoliday
                                    ? "text-rose-600 dark:text-rose-400 font-bold"
                                    : "text-slate-800 dark:text-slate-200 font-medium"
                                }`}
                              >
                                {ev.milestone}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                ev.isHoliday
                                  ? "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  : ev.eventType === "exam"
                                    ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    : ev.eventType === "fest"
                                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {ev.isHoliday ? "Holiday" : ev.eventType || "Milestone"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {campusInfo.name || "Academic Cell"}
            </span>
            <Button
              onClick={() => setIsCalendarModalOpen(false)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── SKILL ASSESSMENTS MODAL (NIAT Core 6 Courses Single-Day Evaluation) ── */}
      <Modal
        open={isSaModalOpen}
        onClose={() => setIsSaModalOpen(false)}
        title="NIAT Skill Assessments (Single-Day Evaluation)"
        description="Single-day comprehensive evaluation for all 6 NIAT technical core courses. Updated by Campus Administration."
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-y-auto max-h-[75vh] pr-1">
          {saExams.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
              No skill assessment scheduled in the database.
            </div>
          ) : (
            <>
              {/* SA Navigation Tabs (SA 2 vs SA 1) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/70 dark:bg-sky-950/40 p-3 rounded-2xl border border-sky-100 dark:border-sky-900/50">
                <div className="flex bg-slate-200/80 dark:bg-slate-700 p-1 rounded-xl">
                  {(["SA 2", "SA 1"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveSaTab(tab);
                        const forTab = saExams.filter((e) =>
                          tab === "SA 1"
                            ? e.examType?.includes("1") || e.iaNumber === "SA 1"
                            : !(e.examType?.includes("1") || e.iaNumber === "SA 1"),
                        );
                        if (forTab.length > 0) {
                          setSelectedSaSubjectCode(forTab[0].code);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeSaTab === tab
                          ? "bg-sky-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span>{tab === "SA 2" ? "Skill Assessment 2" : "Skill Assessment 1"}</span>
                      {tab === "SA 2" ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-700 text-white font-mono">
                          Nov 20
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          Completed
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                      activeSaTab === "SA 2"
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {activeSaTab === "SA 2"
                      ? "Active Evaluation (20 Nov 2026)"
                      : "Conducted on 26 Oct 2026"}
                  </span>
                </div>
              </div>

              {/* Top Unified Single Evaluation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-600 text-white">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                        {activeSaTab === "SA 2"
                          ? "Skill Assessment 2 – Single Evaluation Day (All 6 NIAT Courses)"
                          : "Skill Assessment 1 – Single Evaluation Day (All 6 NIAT Courses)"}
                      </h4>
                      <p className="text-[11px] text-sky-800 dark:text-sky-300">
                        Conducted in a single day for all six subjects. Yoga and University courses
                        are evaluated separately under IA/SEE.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        filteredSaExams[0]?.isTentative
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                      }`}
                    >
                      {filteredSaExams[0]?.isTentative
                        ? "Tentative Schedule"
                        : "Confirmed Schedule"}
                    </span>
                  </div>
                </div>

                {/* Unified Date & Venue (Mentioned ONLY here at the top, not under each subject) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-sky-200/80 dark:border-sky-800/60 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-100 dark:border-sky-900">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Evaluation Date (All 6 Subjects)
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {filteredSaExams[0]?.date || "Date to be announced by Campus Administration"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-100 dark:border-sky-900">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Unified Venue / Platform
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {filteredSaExams[0]?.venue || "Main Computer Science Laboratories & CCBP LMS"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Navigation Pills */}
              <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-850 flex flex-wrap gap-1.5 text-xs">
                {filteredSaExams.map((exam) => {
                  const isSelected =
                    selectedSaExam?.id === exam.id || selectedSaExam?.code === exam.code;
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setSelectedSaSubjectCode(exam.code)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-sky-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                          isSelected
                            ? "bg-sky-700 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {exam.code}
                      </span>
                      <span>{exam.subject}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Subject Detail Card (No separate date mentioned here!) */}
              {selectedSaExam && (
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          {selectedSaExam.code}
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                          {selectedSaExam.subject}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300">
                          NIAT Technical Core Course
                        </span>
                        <span>• Evaluated on the single evaluation date above</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Part of 6-Course Evaluation
                      </span>
                    </div>
                  </div>

                  {/* Syllabus Topics */}
                  {selectedSaExam.syllabusTopics.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Skill Assessment Syllabus Coverage
                      </span>
                      <ul className="space-y-1">
                        {selectedSaExam.syllabusTopics.map((topic, i) => (
                          <li
                            key={i}
                            className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                          >
                            <span className="text-sky-600 font-bold">•</span>
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Question Bank Link Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    {selectedSaExam.syllabusTopics.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedResourceModal({
                            title: `${selectedSaExam.code} - ${selectedSaExam.subject} (Skill Assessment Topics)`,
                            type: "SYLLABUS",
                            content: selectedSaExam.syllabusTopics,
                          })
                        }
                        className="text-sky-600 dark:text-sky-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>View Assessment Rubrics & Syllabus</span>
                      </button>
                    )}

                    {selectedSaExam.questionBankUrl && (
                      <a
                        href={selectedSaExam.questionBankUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Question Bank</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* ── SEMESTER END EXAMS (SEE) MODAL ── */}
      <Modal
        open={isSeeModalOpen}
        onClose={() => setIsSeeModalOpen(false)}
        title="Semester End Examinations (SEE)"
        description="Official university semester examination timetable, practical examinations, and regulatory guidelines."
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-y-auto max-h-[75vh] pr-1">
          {seeExams.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
              No Semester End Examination schedule published yet by the Exam Cell. Campus
              administration will publish timetable and regulations prior to instructional close.
            </div>
          ) : (
            <>
              {/* Subject Selection Pills */}
              <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-850 flex flex-wrap gap-1.5 text-xs">
                {seeExams.map((exam) => {
                  const isSelected =
                    selectedSeeExam?.id === exam.id || selectedSeeExam?.code === exam.code;
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setSelectedSeeSubjectCode(exam.code)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                          isSelected
                            ? "bg-amber-700 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {exam.code}
                      </span>
                      <span>{exam.subject}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected SEE Detail */}
              {selectedSeeExam && (
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          {selectedSeeExam.code}
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                          {selectedSeeExam.subject}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {selectedSeeExam.handledBy === "University"
                          ? "University Course (S-VYASA)"
                          : "NIAT Course Curriculum"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          selectedSeeExam.isTentative
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                        }`}
                      >
                        {selectedSeeExam.isTentative ? "Tentative Schedule" : "Confirmed"}
                      </span>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {selectedSeeExam.session === "FN" ? "Forenoon (FN)" : "Afternoon (AF)"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Exam Date
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedSeeExam.date}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Slot Time & Duration
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedSeeExam.time} (3 Hours)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedResourceModal({
                          title: `${selectedSeeExam.code} - ${selectedSeeExam.subject} (SEE Syllabus)`,
                          type: "SYLLABUS",
                          content: selectedSeeExam.syllabusTopics,
                        })
                      }
                      className="text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>View SEE Syllabus & Examination Rules</span>
                    </button>

                    {selectedSeeExam.questionBankUrl && (
                      <a
                        href={selectedSeeExam.questionBankUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 font-bold flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Question Bank</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* ── FACULTY DIRECTORY MODAL (Opens when clicking Campus Faculty button) ── */}
      <Modal
        open={isFacultyModalOpen}
        onClose={() => setIsFacultyModalOpen(false)}
        title="Campus Faculties & Department Mentors"
        description="Official faculty contact details, designations, and office cabin locations."
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="space-y-4 pt-2 flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search faculty by name, department, cabin..."
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {facultyDepartments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedFacultyDept(dept)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedFacultyDept === dept
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {dept === "ALL" ? "All Departments" : dept}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[55vh] pr-1 space-y-3">
            {filteredFaculties.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <Users className="h-8 w-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Faculty Found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Try adjusting your search query or department filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredFaculties.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-200 dark:border-indigo-800 shrink-0">
                        {fac.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {fac.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                          {fac.designation}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {fac.department}
                      </span>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      {fac.email && (
                        <a
                          href={`mailto:${fac.email}`}
                          className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{fac.email}</span>
                        </a>
                      )}
                      {fac.phone && (
                        <a
                          href={`tel:${fac.phone}`}
                          className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{fac.phone}</span>
                        </a>
                      )}
                      {fac.officeRoom && (
                        <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
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

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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

      {/* ── RESOURCE VIEWER MODAL ── */}
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

      {/* ── CAMPUS ADMIN EDIT MODALS ── */}
      {/* 1. Edit IA Exam Modal */}
      {editingIaExam && (
        <Modal
          open={Boolean(editingIaExam)}
          onClose={() => setEditingIaExam(null)}
          title={`Edit IA Details: ${editingIaExam.subject}`}
          description={`Update official exam date, time slot, syllabus, and Question Bank link for ${editingIaExam.iaNumber}.`}
          className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const qbUrl = (formData.get("questionBankUrl") as string)?.trim();
              const date = (formData.get("date") as string)?.trim();
              const time = (formData.get("time") as string)?.trim();
              const session = formData.get("session") as "FN" | "AF";
              const isTentative = formData.get("isTentative") === "on";
              const rawTopics = (formData.get("syllabusTopics") as string) || "";
              const topics = rawTopics
                .split("\n")
                .map((t) => t.trim())
                .filter(Boolean);

              try {
                await fetch("/api/campus/schedule", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: editingIaExam.id,
                    type: "ia",
                    questionBankUrl: qbUrl || null,
                    notes: date ? `${date} ${time || ""}`.trim() : undefined,
                    syllabus: topics.join(", "),
                    isTentative,
                  }),
                });
              } catch (err) {
                console.error("Failed to update IA schedule in database", err);
              }

              setIaExams((prev) =>
                prev.map((item) =>
                  item.id === editingIaExam.id
                    ? {
                        ...item,
                        questionBankUrl: qbUrl || undefined,
                        date: date || item.date,
                        time: time || item.time,
                        session: session || item.session,
                        isTentative,
                        syllabusTopics: topics.length > 0 ? topics : item.syllabusTopics,
                      }
                    : item,
                ),
              );
              setEditingIaExam(null);
            }}
            className="space-y-3.5 pt-2 text-xs overflow-y-auto max-h-[70vh] pr-1"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Question Bank Link (URL)
              </label>
              <input
                type="url"
                name="questionBankUrl"
                defaultValue={editingIaExam.questionBankUrl || ""}
                placeholder="https://learning.ccbp.in/... or https://drive.google.com/..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Examination Date
                </label>
                <input
                  type="text"
                  name="date"
                  defaultValue={editingIaExam.date}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Session Timing
                </label>
                <input
                  type="text"
                  name="time"
                  defaultValue={editingIaExam.time}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Session Slot
                </label>
                <select
                  name="session"
                  defaultValue={editingIaExam.session}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="FN">Forenoon (FN: 09:30 AM – 11:00 AM)</option>
                  <option value="AF">Afternoon (AF: 02:00 PM – 03:30 PM)</option>
                </select>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name="isTentative"
                    defaultChecked={editingIaExam.isTentative}
                    className="rounded text-purple-600 h-4 w-4"
                  />
                  <span>Mark Date as Tentative</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Syllabus Topics (One per line)
              </label>
              <textarea
                name="syllabusTopics"
                rows={4}
                defaultValue={editingIaExam.syllabusTopics.join("\n")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingIaExam(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Edit CIA Item Modal */}
      {editingCiaItem && (
        <Modal
          open={Boolean(editingCiaItem)}
          onClose={() => setEditingCiaItem(null)}
          title={`Edit CIA: ${editingCiaItem.subject}`}
          description={`Update assignment topic, due date, submission status, and rubric guidelines for ${editingCiaItem.ciaNumber}.`}
          className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const topic = (formData.get("topic") as string)?.trim();
              const dueDate = (formData.get("dueDate") as string)?.trim();
              const status = formData.get("status") as "PENDING" | "SUBMITTED" | "EXTENDED";

              try {
                await fetch("/api/campus/schedule", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: editingCiaItem.id,
                    type: "cia",
                    topic: topic || null,
                    status,
                    notes: dueDate || undefined,
                  }),
                });
              } catch (err) {
                console.error("Failed to update CIA assessment in database", err);
              }

              setCiaAssessments((prev) =>
                prev.map((item) =>
                  item.id === editingCiaItem.id
                    ? {
                        ...item,
                        topic: topic || item.topic,
                        submissionDate: dueDate || item.submissionDate,
                        status: status || item.status,
                      }
                    : item,
                ),
              );
              setEditingCiaItem(null);
            }}
            className="space-y-3.5 pt-2 text-xs overflow-y-auto max-h-[70vh] pr-1"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assessment Topic
              </label>
              <input
                type="text"
                name="topic"
                defaultValue={editingCiaItem.topic || ""}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Submission Due Date
                </label>
                <input
                  type="text"
                  name="dueDate"
                  defaultValue={editingCiaItem.submissionDate}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingCiaItem.status}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="PENDING">PENDING (Open for submissions)</option>
                  <option value="SUBMITTED">SUBMITTED (Completed)</option>
                  <option value="EXTENDED">EXTENDED (Deadline relaxed)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingCiaItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Save Assessment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Edit Course Modal */}
      {editingCourse && (
        <Modal
          open={Boolean(editingCourse)}
          onClose={() => setEditingCourse(null)}
          title={`Edit Course: ${editingCourse.name} (${editingCourse.code})`}
          description="Update assigned faculty instructor and departmental mentor."
          className="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const faculty = formData.get("faculty") as string;
              const mentor = formData.get("mentor") as string;

              setCoursesList((prev) =>
                prev.map((c) =>
                  c.id === editingCourse.id
                    ? {
                        ...c,
                        faculty: faculty.trim() || undefined,
                        mentor: mentor.trim() || undefined,
                      }
                    : c,
                ),
              );
              setEditingCourse(null);
            }}
            className="space-y-3.5 pt-2 text-xs"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Faculty Instructor Name
              </label>
              <input
                type="text"
                name="faculty"
                defaultValue={editingCourse.faculty || ""}
                placeholder="e.g. Faculty Name"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Departmental Mentor Name
              </label>
              <input
                type="text"
                name="mentor"
                defaultValue={editingCourse.mentor || ""}
                placeholder="e.g. Mentor Name"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingCourse(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save Mentors
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── REPORT POLL MODAL ── */}
      {reportingPollPostId && (
        <Modal
          open={Boolean(reportingPollPostId)}
          onClose={() => {
            setReportingPollPostId(null);
            setReportSuccess(false);
            setReportDetails("");
          }}
          title="Report Poll"
          className="max-w-md"
        >
          {reportSuccess ? (
            <div className="p-6 text-center space-y-3">
              <Check className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Report Submitted
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thank you for your report. Campus moderators will review this poll.
              </p>
              <Button
                onClick={() => {
                  setReportingPollPostId(null);
                  setReportSuccess(false);
                  setReportDetails("");
                }}
                className="text-xs font-bold"
              >
                Done
              </Button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reportingPollPostId || submittingReport) return;
                setSubmittingReport(true);
                try {
                  const res = await fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contentType: "POST",
                      postId: reportingPollPostId,
                      reason: reportReason,
                      details: reportDetails.trim(),
                    }),
                  });
                  if (res.ok) {
                    setReportSuccess(true);
                  }
                } catch {
                  // silent
                } finally {
                  setSubmittingReport(false);
                }
              }}
              className="space-y-4 pt-2 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="SPAM">Spam or misleading</option>
                  <option value="HARASSMENT">Harassment or bullying</option>
                  <option value="HATE_SPEECH">Hate speech</option>
                  <option value="MISINFORMATION">Misinformation</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional context for campus administrators..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReportingPollPostId(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReport}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
