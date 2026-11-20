export interface CiaEntry {
  id: string;
  ciaNumber: "CIA 1" | "CIA 2" | "CIA 3";
  subject: string;
  code: string;
  topic?: string;
  submissionDate: string;
  status: "SUBMITTED" | "PENDING" | "EXTENDED";
  handledBy: "NIAT" | "University";
}

export interface IaEntry {
  id: string;
  iaNumber: "IA 1" | "IA 2" | "SA 1" | "SA 2";
  examType?: string;
  subject: string;
  code: string;
  date: string;
  time: string;
  session: "FN" | "AF";
  handledBy: "NIAT" | "University";
  isTentative?: boolean;
  syllabusTopics: string[];
  questionBankUrl?: string;
  venue?: string;
}

export interface SemesterSubjectItem {
  id: string;
  name: string;
  code: string;
  credits: number;
  type: string;
  handledBy: "NIAT" | "University";
  description?: string;
  faculty?: string;
  mentor?: string;
  questionBankUrl?: string;
}

export interface CampusCalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "EXAM" | "FEST" | "HOLIDAY" | "WORKSHOP";
  location: string;
  isLive?: boolean;
}

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string | null;
  phone: string | null;
  officeRoom: string | null;
}

export interface CampusNotificationItem {
  id: string;
  title: string;
  description: string;
  category: "URGENT" | "ACADEMIC" | "EXAM" | "EVENT" | "FACILITY";
  tag: string;
  timestamp: string;
  author: string;
  unread?: boolean;
}

export interface CampusPollOption {
  id: string;
  label: string;
  votes: number;
  pct: number;
}

export interface CampusPollItem {
  id: string;
  title: string;
  question: string;
  category: string;
  totalVotes: number;
  endsAt: string;
  options: CampusPollOption[];
}

// ── STRICT DATABASE-BACKED RUNTIME (NO HARDCODED FAKE DATA) ──
export const defaultFaculties: Faculty[] = [];
export const thirdSemSubjects: SemesterSubjectItem[] = [];
export const initialIaExaminations: IaEntry[] = [];
export const initialCiaAssessments: CiaEntry[] = [];
export const officialAcademicCalendar: Array<{ month: string; milestone: string }> = [];
export const officialUpcomingEvents: CampusCalendarEvent[] = [];
export const defaultNotifications: CampusNotificationItem[] = [];
