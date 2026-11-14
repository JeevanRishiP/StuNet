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
  iaNumber: "IA 1" | "IA 2";
  subject: string;
  code: string;
  date: string;
  time: string;
  session: "FN" | "AF";
  handledBy: "NIAT" | "University";
  isTentative?: boolean;
  syllabusTopics: string[];
  questionBankUrl?: string;
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

export const defaultFaculties: Faculty[] = [
  {
    id: "fac-1",
    name: "G Satya Aparna",
    designation: "Assistant Professor",
    department: "Computer Science & Engineering",
    email: "satyaaparna-gedela@gmail.com",
    phone: "+91 98765 43210",
    officeRoom: "Cabin B-204, Academic Block",
  },
  {
    id: "fac-2",
    name: "Sushmitha Amarnath",
    designation: "Assistant Professor",
    department: "Computer Science & Engineering",
    email: "sushmitha-amarnath@gmail.com",
    phone: "+91 98765 43211",
    officeRoom: "Cabin B-208, Academic Block",
  },
  {
    id: "fac-3",
    name: "Jancy Bhaskar",
    designation: "Operations Coordinator",
    department: "Campus Administration",
    email: "jancybhaskar@nxtwave.com",
    phone: "+91 98765 43212",
    officeRoom: "Admin Wing, Ground Floor",
  },
];

// ── 3RD SEMESTER SUBJECTS (2025 BATCH) ──
export const thirdSemSubjects: SemesterSubjectItem[] = [
  {
    id: "sub-1",
    name: "Core Data Structure and Intermediate Algorithms",
    code: "BTNX331",
    credits: 4,
    type: "Theory",
    handledBy: "NIAT",
    faculty: "",
    mentor: "",
  },
  {
    id: "sub-2",
    name: "Applied Communication English",
    code: "BTNX313",
    credits: 3,
    type: "Theory",
    handledBy: "NIAT",
    faculty: "",
    mentor: "",
  },
  {
    id: "sub-3",
    name: "Backend Development",
    code: "BTNX333",
    credits: 4,
    type: "Theory",
    handledBy: "NIAT",
    faculty: "",
    mentor: "",
  },
  {
    id: "sub-4",
    name: "Fundamentals of Probability and Statistics",
    code: "BTNX311",
    credits: 3,
    type: "Theory",
    handledBy: "NIAT",
    faculty: "",
    mentor: "",
  },
  {
    id: "sub-5",
    name: "AI for Finance",
    code: "BTNX314",
    credits: 3,
    type: "Theory",
    handledBy: "NIAT",
    faculty: "",
    mentor: "",
  },
  {
    id: "sub-6",
    name: "Logical Reasoning",
    code: "BTNX312",
    credits: 2,
    type: "Theory",
    handledBy: "NIAT",
    faculty: "",
    mentor: "",
  },
  {
    id: "sub-7",
    name: "Yoga and Wellness",
    code: "SVY301",
    credits: 2,
    type: "University Foundation",
    handledBy: "University",
    faculty: "",
    mentor: "",
  },
];

// ── IA EXAMINATIONS (IA 1 & IA 2 WITH COURSE CODES & COMPLETE SYLLABUS) ──
export const initialIaExaminations: IaEntry[] = [
  // ── IA 1 (Sep 28 – Oct 01, 2026) ──
  {
    id: "ia-1-ds",
    iaNumber: "IA 1",
    subject: "Core Data Structure and Intermediate Algorithms",
    code: "BTNX331",
    date: "Sep 28, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "NIAT",
    syllabusTopics: [
      "Hashing",
      "Prefix Sum",
      "Sliding Window, Two-Pointer Technique",
      "Longest Subarray with Sum K",
      "Largest Subarray Sum",
      "Two Sum",
      "Introduction to Linked List",
      "Insertion in Linked List",
      "Deletion in Linked List",
      "Introduction to Doubly Linked List",
      "Insertion in Doubly Linked List",
      "Deletion in Doubly Linked List",
      "Circular Linked List",
      "Reversing a Linked List",
      "Cycle Detection In Linked List",
      "Length of Cycle In Linked List",
      "Adding Two Numbers",
      "Merge Two Sorted Linked List",
      "Intersection Of Two Linked Lists",
      "Flatten a Linked List",
    ],
  },
  {
    id: "ia-1-eng",
    iaNumber: "IA 1",
    subject: "Applied Communication English",
    code: "BTNX313",
    date: "Sep 28, 2026",
    time: "02:00 PM – 03:00 PM",
    session: "AF",
    handledBy: "NIAT",
    syllabusTopics: [
      "Accuracy in sentence structure",
      "Accuracy in Sentence Structure: Activity",
      "The Language of Connection",
      "The Language of Connection: Activity",
      "Real Time Session 1: Activity",
    ],
  },
  {
    id: "ia-1-backend",
    iaNumber: "IA 1",
    subject: "Backend Development",
    code: "BTNX333",
    date: "Sep 29, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "NIAT",
    syllabusTopics: [
      "Introduction to Backend Development",
      "Cloud IDE Walkthrough",
      "Introduction to Express JS",
      "Solving A Node JS Question In Cloud IDE",
      "Introduction to Express JS | Part 2",
      "Introduction to Express JS | Part 3",
      "REST APIs",
      "Debugging Common Errors",
      "Debugging Common Errors | Part 2",
    ],
  },
  {
    id: "ia-1-prob",
    iaNumber: "IA 1",
    subject: "Fundamentals of Probability and Statistics",
    code: "BTNX311",
    date: "Sep 29, 2026",
    time: "02:00 PM – 03:00 PM",
    session: "AF",
    handledBy: "NIAT",
    syllabusTopics: [
      "Introduction to Probability & Statistics in ML",
      "Introduction to Statistics & Datasets",
      "Data Visualization - I",
      "Data Visualization - II",
      "Measures of Central Tendency",
      "Measures of Variability",
      "Skewness and Outliers",
      "Basics of Probability",
      "Probability Rules & Theorems",
      "Conditional Probability",
      "Law of Partition and Total Probability",
      "Baye's Theorem and counting principles",
    ],
  },
  {
    id: "ia-1-aifin",
    iaNumber: "IA 1",
    subject: "AI for Finance",
    code: "BTNX314",
    date: "Sep 30, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "NIAT",
    syllabusTopics: [
      "Your Learning Journey",
      "Introduction to AI For Finance",
      "Building Personal Finance Advisor",
      "Introduction to RAG Evaluation",
    ],
  },
  {
    id: "ia-1-lr",
    iaNumber: "IA 1",
    subject: "Logical Reasoning",
    code: "BTNX312",
    date: "Sep 30, 2026",
    time: "02:00 PM – 03:00 PM",
    session: "AF",
    handledBy: "NIAT",
    syllabusTopics: [
      "Introduction",
      "Linear Arrangements",
      "Circular Arrangements",
      "Blood Relations 1",
      "Blood Relations 2",
    ],
  },
  {
    id: "ia-1-yoga",
    iaNumber: "IA 1",
    subject: "Yoga and Wellness",
    code: "SVY301",
    date: "Oct 01, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "University",
    syllabusTopics: [
      "Foundations of Classical Yoga & Patanjali Sutras",
      "Asana Alignment & Postural Correction",
      "Pranayama Breathing & Vital Capacity Enhancement",
      "Mind-Body Relaxation & Mindfulness",
    ],
  },

  // ── IA 2 (Nov 23 – Nov 26, 2026 • Tentative End of November) ──
  {
    id: "ia-2-ds",
    iaNumber: "IA 2",
    subject: "Core Data Structure and Intermediate Algorithms",
    code: "BTNX331",
    date: "Nov 23, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "NIAT",
    isTentative: true,
    syllabusTopics: [
      "Introduction of Stack",
      "Stack Implementation Using Array",
      "Stack Implementation Using Linked List",
      "Introduction to Monotonic Stacks",
      "Infix, Prefix, and Postfix Notations",
      "Balanced Parenthesis",
      "Asteroid Collision",
      "Largest Rectangle In Histogram",
      "Queue - Introduction & Implementation Using Arrays",
      "Queue Implementation Using Linked List",
      "Implement Stack Using Queue",
      "Implement Queue Using Stack - Part - 1",
      "Introduction to Binary Trees & Binary Tree Traversals",
      "Pre-Order, In-Order, Post-Order, Level Order Traversals",
      "Height & Balanced Binary Tree",
      "Diameter & Maximum Path Sum of Binary Tree",
      "Top view & Right view of Binary Tree",
      "Lowest Common Ancestor of a Binary Tree",
      "Introduction to Binary Search Tree (BST)",
      "Insertion & Deletion in Binary Search Tree",
      "Kth Smallest Element in BST",
      "Validate a Binary Search Tree",
      "Predecessor and Successor in BST",
      "Merge Two BSTs",
      "Introduction to Heaps",
    ],
  },
  {
    id: "ia-2-eng",
    iaNumber: "IA 2",
    subject: "Applied Communication English",
    code: "BTNX313",
    date: "Nov 23, 2026",
    time: "02:00 PM – 03:00 PM",
    session: "AF",
    handledBy: "NIAT",
    isTentative: true,
    syllabusTopics: [
      "Emphasizing Self-Expression & Activity",
      "Real Time Session 3: Activity",
      "Expressing Possibility and Obligation",
      "Rephrasing Speech Accurately",
      "Real Time Session 4: Activity",
      "Shifting Focus in Communication",
      "Improving Natural Fluency",
      "Real Time Session 5: Activity",
      "Enhancing Communicative Style: Reading Material",
      "Balancing Ideas Clearly & Activity",
      "Managing Hesitation and Emphasizing Key Points",
      "Real Time Session 6: Activity",
    ],
  },
  {
    id: "ia-2-backend",
    iaNumber: "IA 2",
    subject: "Backend Development",
    code: "BTNX333",
    date: "Nov 24, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "NIAT",
    isTentative: true,
    syllabusTopics: [
      "Authentication & Authentication | Part 2",
      "File Systems Part - 1 & File Systems Part - 2",
      "Streams",
      "Connecting MongoDB to NodeJS",
      "Implementing CRUD Operations | Part 1",
      "Filtering and Sorting",
      "Protected Routes with JWT Authentication",
      "Role-Based Authorization",
    ],
  },
  {
    id: "ia-2-prob",
    iaNumber: "IA 2",
    subject: "Fundamentals of Probability and Statistics",
    code: "BTNX311",
    date: "Nov 24, 2026",
    time: "02:00 PM – 03:00 PM",
    session: "AF",
    handledBy: "NIAT",
    isTentative: true,
    syllabusTopics: [
      "Discrete Random Variables",
      "Binomial Distribution",
      "Poisson Distribution",
      "Normal Distribution - I & Normal Distribution - II",
      "Other Continuous Probability Distributions",
      "Introduction to Inferential Statistics",
      "Sampling Distribution",
      "Confidence Intervals & Confidence Levels",
      "Testing of Hypothesis - Mean",
      "Chi - Squared Test",
      "Anova & F - Test - one way",
      "Anova & F - Test - two way",
      "Covariance and Correlation",
      "Linear Regression",
      "Multiple Linear Regression",
    ],
  },
  {
    id: "ia-2-aifin",
    iaNumber: "IA 2",
    subject: "AI for Finance",
    code: "BTNX314",
    date: "Nov 25, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "NIAT",
    isTentative: true,
    syllabusTopics: [
      "Enhancing Productivity with AI",
      "Building a Trading Agent | Part 1 & Part 2",
      "Introduction to LLM Observability",
      "Integrating Langsmith with the trading Agent",
      "Building a Financial Fraud Detection Model | Part 1 & Part 2",
      "Evaluating the Financial Fraud Detection Model",
      "Building a Financial Fraud Detection Agent",
      "Introduction to AI Ethics & Responsible AI",
      "Building AI Guardrails | Part 1 & Part 2",
    ],
  },
  {
    id: "ia-2-lr",
    iaNumber: "IA 2",
    subject: "Logical Reasoning",
    code: "BTNX312",
    date: "Nov 25, 2026",
    time: "02:00 PM – 03:00 PM",
    session: "AF",
    handledBy: "NIAT",
    isTentative: true,
    syllabusTopics: [
      "Company Specific Session - Arrangements & Blood relations",
      "Venn Diagrams",
      "Syllogisms 1 & Syllogisms 2",
      "Cubes",
      "Company Specific Session - Venn Diagrams, Syllogisms, Cubes",
      "Puzzles",
      "Data Sufficiency",
      "Company Specific Session - Puzzles & Data Sufficiency",
      "Counting Figures",
      "Visual Reasoning",
    ],
  },
  {
    id: "ia-2-yoga",
    iaNumber: "IA 2",
    subject: "Yoga and Wellness",
    code: "SVY301",
    date: "Nov 26, 2026",
    time: "10:00 AM – 11:00 AM",
    session: "FN",
    handledBy: "University",
    isTentative: true,
    syllabusTopics: [
      "Cyclic Meditation Techniques & Stress Management",
      "Pranic Energisation Techniques (PET)",
      "Yogic Lifestyle Management (Ahara, Vihara, Achara, Vichara)",
      "Classical Texts on Yoga: Patanjali Yoga Sutra Overview",
      "Practical Viva & Asana Evaluation",
    ],
  },
];

// ── CIA ASSESSMENTS (SUBJECT-WISE FOR CIA 1, CIA 2, CIA 3) ──
export const initialCiaAssessments: CiaEntry[] = [
  // ── CIA 1 (Due / Freezing Date: Sep 07, 2026) ──
  {
    id: "cia-1-ds",
    ciaNumber: "CIA 1",
    subject: "Core Data Structure and Intermediate Algorithms",
    code: "BTNX331",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-1-eng",
    ciaNumber: "CIA 1",
    subject: "Applied Communication English",
    code: "BTNX313",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-1-be",
    ciaNumber: "CIA 1",
    subject: "Backend Development",
    code: "BTNX333",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-1-stats",
    ciaNumber: "CIA 1",
    subject: "Fundamentals of Probability and Statistics",
    code: "BTNX311",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-1-fin",
    ciaNumber: "CIA 1",
    subject: "AI for Finance",
    code: "BTNX314",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-1-lr",
    ciaNumber: "CIA 1",
    subject: "Logical Reasoning",
    code: "BTNX312",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-1-yoga",
    ciaNumber: "CIA 1",
    subject: "Yoga and Wellness",
    code: "SVY301",
    submissionDate: "Sep 07, 2026",
    status: "SUBMITTED",
    handledBy: "University",
  },

  // ── CIA 2 (Due / Freezing Date: Oct 16 – Nov 15, 2026) ──
  {
    id: "cia-2-ds",
    ciaNumber: "CIA 2",
    subject: "Core Data Structure and Intermediate Algorithms",
    code: "BTNX331",
    submissionDate: "Oct 16, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-2-eng",
    ciaNumber: "CIA 2",
    subject: "Applied Communication English",
    code: "BTNX313",
    submissionDate: "Nov 15, 2026",
    status: "EXTENDED",
    handledBy: "NIAT",
  },
  {
    id: "cia-2-be",
    ciaNumber: "CIA 2",
    subject: "Backend Development",
    code: "BTNX333",
    submissionDate: "Oct 16, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-2-stats",
    ciaNumber: "CIA 2",
    subject: "Fundamentals of Probability and Statistics",
    code: "BTNX311",
    submissionDate: "Oct 16, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-2-fin",
    ciaNumber: "CIA 2",
    subject: "AI for Finance",
    code: "BTNX314",
    submissionDate: "Oct 16, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-2-lr",
    ciaNumber: "CIA 2",
    subject: "Logical Reasoning",
    code: "BTNX312",
    submissionDate: "Oct 16, 2026",
    status: "SUBMITTED",
    handledBy: "NIAT",
  },
  {
    id: "cia-2-yoga",
    ciaNumber: "CIA 2",
    subject: "Yoga and Wellness",
    code: "SVY301",
    submissionDate: "Nov 20, 2026",
    status: "PENDING",
    handledBy: "University",
  },

  // ── CIA 3 (Due / Freezing Date: Dec 04, 2026) ──
  {
    id: "cia-3-ds",
    ciaNumber: "CIA 3",
    subject: "Core Data Structure and Intermediate Algorithms",
    code: "BTNX331",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "NIAT",
  },
  {
    id: "cia-3-eng",
    ciaNumber: "CIA 3",
    subject: "Applied Communication English",
    code: "BTNX313",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "NIAT",
  },
  {
    id: "cia-3-be",
    ciaNumber: "CIA 3",
    subject: "Backend Development",
    code: "BTNX333",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "NIAT",
  },
  {
    id: "cia-3-stats",
    ciaNumber: "CIA 3",
    subject: "Fundamentals of Probability and Statistics",
    code: "BTNX311",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "NIAT",
  },
  {
    id: "cia-3-fin",
    ciaNumber: "CIA 3",
    subject: "AI for Finance",
    code: "BTNX314",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "NIAT",
  },
  {
    id: "cia-3-lr",
    ciaNumber: "CIA 3",
    subject: "Logical Reasoning",
    code: "BTNX312",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "NIAT",
  },
  {
    id: "cia-3-yoga",
    ciaNumber: "CIA 3",
    subject: "Yoga and Wellness",
    code: "SVY301",
    submissionDate: "Dec 04, 2026",
    status: "PENDING",
    handledBy: "University",
  },
];

// ── ACADEMIC CALENDAR 2026–2027 EXTRACTED DIRECTLY FROM OFFICIAL S-VYASA DOCUMENT ──
export const officialAcademicCalendar = [
  {
    month: "August 2026",
    milestone:
      "Commencement of Odd Semester (Aug 10) • Independence Day (Aug 15) • Id-Milad (Aug 26)",
  },
  {
    month: "September 2026",
    milestone:
      "Freezing of Marks CIA-1 (Sep 07) • Ganesh Chaturthi (Sep 14) • Class Committee Meeting 1 (Sep 22) • Internal Assessment 1 (Sep 28–30)",
  },
  {
    month: "October 2026",
    milestone:
      "Gandhi Jayanthi (Oct 02) • Freezing of Marks IA-1 (Oct 07) • Parent Teacher Meeting (Oct 09–10) • Freezing of Marks CIA-2 (Oct 16) • Ayudha Pooja (Oct 20) • Vijayadashami (Oct 21) • CCM-2 (Oct 28)",
  },
  {
    month: "November 2026",
    milestone:
      "Balipadyami / Deepavali (Nov 10) • Internal Assessment 2 (Nov 23–25, Tentative End of November)",
  },
  {
    month: "December 2026",
    milestone:
      "Freezing of Marks IA-2 (Dec 02) • Freezing of Marks CIA-3/P (Dec 04) • Semester End Practical Exams (Dec 14–18) • Consolidated Marks (Dec 18) • Freezing SEE Practical (Dec 19) • Last Instructional Day (Dec 23) • Study Holidays (Dec 24–30) • Christmas Day (Dec 25)",
  },
  {
    month: "January 2027",
    milestone:
      "Kalpatharu Day (Jan 01) • Commencement of Semester End Exams (Jan 06 Tentative) • Convocation (Jan 12) • Makar Sankranti (Jan 15) • Republic Day (Jan 26)",
  },
  {
    month: "Even Semester (Feb – Aug 2027)",
    milestone:
      "Commencement of Even Semester (Feb 08) • Even Sem IA-1 (Mar 29–31) • Kala Vilas 2027 (May 17–21) • Even Sem IA-2 (May 24–26) • International Day of Yoga (Jun 21) • End Sem Exams (Jun 28) • Summer Term & Internships (Jul 12)",
  },
];

export const officialUpcomingEvents: CampusCalendarEvent[] = [
  {
    id: "ev-ia2",
    title: "Internal Assessment – 2 (IA 2) Examinations",
    date: "Nov 23 – 25, 2026 (Tentative End of Nov)",
    type: "EXAM",
    location: "Main Academic Block, Exam Halls 1–3",
    isLive: true,
  },
  {
    id: "ev-cia3",
    title: "Freezing of Marks CIA – 3/P (Portfolio)",
    date: "Dec 04, 2026",
    type: "WORKSHOP",
    location: "LMS Submission Portal",
  },
  {
    id: "ev-practicals",
    title: "Semester End Practical Lab Examinations",
    date: "Dec 14 – 18, 2026",
    type: "EXAM",
    location: "Advanced Research Lab & Innovation Sandbox",
  },
  {
    id: "ev-holidays",
    title: "Study Holidays & Christmas Break",
    date: "Dec 24 – 30, 2026",
    type: "HOLIDAY",
    location: "All Campus Blocks",
  },
  {
    id: "ev-see",
    title: "Semester End Theory Examinations (SEE Jan 2027)",
    date: "Jan 06, 2027 (Tentative)",
    type: "EXAM",
    location: "Main University Academic Block",
  },
  {
    id: "ev-convocation",
    title: "S-VYASA Annual University Convocation",
    date: "Jan 12, 2027",
    type: "FEST",
    location: "University Grand Auditorium",
  },
];

export const defaultNotifications: CampusNotificationItem[] = [
  {
    id: "notif-1",
    title: "IA 2 Examination Window Notification (End of November)",
    description:
      "As per the S-VYASA Academic Calendar, IA 2 examinations for 3rd Semester B.Tech CSE (2025 Batch) are scheduled tentatively between Nov 23 and Nov 25, 2026. Official session timetables will be posted by the Exam Cell.",
    category: "EXAM",
    tag: "Exam Notice",
    timestamp: "Today",
    author: "Controller of Examinations",
    unread: true,
  },
  {
    id: "notif-2",
    title: "CIA 2 English - Submission Date Extended to Nov 15",
    description:
      "The Academic Dean Office has approved a grace extension for Technical Communication (BTNX313) CIA 2 whitepaper submission. Final deadline: Nov 15, 2026, 11:59 PM.",
    category: "URGENT",
    tag: "Deadline Extended",
    timestamp: "2 hours ago",
    author: "Academic Dean Office",
    unread: true,
  },
  {
    id: "notif-3",
    title: "University Subject: Yoga & Wellness Internal Evaluation",
    description:
      "Students of 3rd Sem B.Tech CSE are reminded that Yoga and Wellness (SVY301) is a mandatory university curriculum subject. Practical viva and journal submission will be held at the Yoga & Wellness Center.",
    category: "ACADEMIC",
    tag: "University Subject",
    timestamp: "Yesterday",
    author: "S-VYASA Yoga Department",
    unread: false,
  },
  {
    id: "notif-4",
    title: "Inter-Campus Hackathon 'NIAT Hack 2026' Registrations Active",
    description:
      "Team registrations are live for the 36-hour flagship hackathon on Nov 20–21 at Innovation Sandbox Block B. ₹1,50,000 prize pool and direct industry mentorship.",
    category: "EVENT",
    tag: "Campus Event",
    timestamp: "Nov 08, 2026",
    author: "Innovation Sandbox & Hackathon Club",
    unread: false,
  },
];
