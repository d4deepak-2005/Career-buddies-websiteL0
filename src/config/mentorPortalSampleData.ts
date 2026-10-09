// ---------------------------------------------------------------------------
// Mentor Portal: SAMPLE DATA
// ---------------------------------------------------------------------------
// There is no mentor-specific session API yet: sessions today are admin-entered
// CandidateItem records (kind "session") that only store a free-text advisorName,
// so they cannot be safely tied to one mentor account. Until a real endpoint exists
// (e.g. GET /api/mentor/sessions returning MentorPortalData for the signed-in mentor),
// the portal renders this clearly labelled sample data.
//
// To switch to real data, change loadMentorPortalData() in
// src/hooks/useMentorPortalData.ts; the screens only depend on the types below.
// ---------------------------------------------------------------------------

export type MentorSessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface MentorCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  currentRole: string;
  experience: string;
  targetRole: string;
  location?: string;
  resumeAvailable: boolean;
  resumeUrl?: string;
  linkedinUrl?: string;
  summary?: string;
}

export interface MentorSession {
  id: string; // shown as "#S028"
  candidateId: string;
  sessionType: string; // e.g. "Career Counselling"
  careerGoal: string; // e.g. "Transition to Product Management"
  startsAt: string; // ISO 8601 with offset (IST)
  durationMinutes: number;
  status: MentorSessionStatus;
  meetingUrl?: string; // empty in the sample data
  brief?: string; // pre-session brief prepared for the mentor
  notes?: string; // mentor's post-session notes
  notesSubmitted: boolean;
}

export interface MentorAvailabilitySlot {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  enabled: boolean;
  start: string; // "18:00" (IST)
  end: string; // "21:00" (IST)
}

export interface MentorProfileSummary {
  name: string;
  title: string;
  email: string;
  expertise: string[];
}

export interface MentorPortalSummary {
  totalSessionsConducted: number;
  completedThisMonth: number;
  upcomingSessions: number;
  assignedCandidates: number;
}

export interface MentorPortalData {
  isSample: boolean;
  mentor: MentorProfileSummary;
  summary: MentorPortalSummary;
  candidates: MentorCandidate[];
  sessions: MentorSession[];
  availability: MentorAvailabilitySlot[];
}

const candidates: MentorCandidate[] = [
  {
    id: 'c-priya',
    name: 'Priya Mehta',
    email: 'priya.mehta@example.com',
    phone: '+91 98XXXXXX01',
    currentRole: 'Sales Executive',
    experience: '3 years',
    targetRole: 'Associate Product Manager',
    location: 'Bengaluru',
    resumeAvailable: true,
    summary: 'B2B SaaS sales background; wants to move into product management within 12 months.',
  },
  {
    id: 'c-rahul',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+91 98XXXXXX02',
    currentRole: 'Business Analyst',
    experience: '5 years',
    targetRole: 'Product Manager',
    location: 'Pune',
    resumeAvailable: true,
    summary: 'Strong analytics and stakeholder management; preparing for PM interviews.',
  },
  {
    id: 'c-ananya',
    name: 'Ananya Rao',
    email: 'ananya.rao@example.com',
    phone: '+91 98XXXXXX03',
    currentRole: 'Software Engineer',
    experience: '4 years',
    targetRole: 'Technical Product Manager',
    location: 'Hyderabad',
    resumeAvailable: true,
    summary: 'Backend engineer exploring a move into product roles.',
  },
  {
    id: 'c-karan',
    name: 'Karan Shah',
    email: 'karan.shah@example.com',
    phone: '+91 98XXXXXX04',
    currentRole: 'Operations Manager',
    experience: '7 years',
    targetRole: 'Senior Operations Leader',
    location: 'Mumbai',
    resumeAvailable: true,
    summary: 'Runs a 20-person ops team; working on leadership skill gaps.',
  },
  {
    id: 'c-neha',
    name: 'Neha Kapoor',
    email: 'neha.kapoor@example.com',
    currentRole: 'HR Generalist',
    experience: '2 years',
    targetRole: 'HR Business Partner',
    location: 'Delhi NCR',
    resumeAvailable: true,
  },
  {
    id: 'c-arjun',
    name: 'Arjun Nair',
    email: 'arjun.nair@example.com',
    currentRole: 'Data Analyst',
    experience: '3 years',
    targetRole: 'Data Scientist',
    location: 'Kochi',
    resumeAvailable: false,
  },
  {
    id: 'c-sneha',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@example.com',
    currentRole: 'Marketing Associate',
    experience: '2 years',
    targetRole: 'Product Marketing Manager',
    location: 'Chennai',
    resumeAvailable: true,
  },
  {
    id: 'c-vikram',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@example.com',
    currentRole: 'Project Manager',
    experience: '9 years',
    targetRole: 'Program Director',
    location: 'Ahmedabad',
    resumeAvailable: true,
  },
];

const sessions: MentorSession[] = [
  {
    id: 'S029',
    candidateId: 'c-neha',
    sessionType: 'Resume Review',
    careerGoal: 'Move into an HRBP role',
    startsAt: '2026-11-02T18:00:00+05:30',
    durationMinutes: 60,
    status: 'scheduled',
    brief: 'Review the updated resume and LinkedIn headline for HRBP applications.',
    notesSubmitted: false,
  },
  {
    id: 'S028',
    candidateId: 'c-priya',
    sessionType: 'Career Counselling',
    careerGoal: 'Transition to Product Management',
    startsAt: '2026-10-07T16:00:00+05:30',
    durationMinutes: 60,
    status: 'scheduled',
    brief:
      'Priya has 3 years of B2B SaaS sales experience and wants to move into product management. Discuss transferable skills, a 90-day learning plan and how to position her customer insight for APM roles.',
    notesSubmitted: false,
  },
  {
    id: 'S027',
    candidateId: 'c-rahul',
    sessionType: 'Mock Interview',
    careerGoal: 'Product Manager interview',
    startsAt: '2026-10-09T18:00:00+05:30',
    durationMinutes: 60,
    status: 'scheduled',
    brief:
      'Full PM mock interview: product sense (design a feature for a fintech app), one estimation question and behavioural questions. Rahul has interviews lined up in two weeks.',
    notesSubmitted: false,
  },
  {
    id: 'S026',
    candidateId: 'c-ananya',
    sessionType: 'Career Strategy',
    careerGoal: 'Move into product roles',
    startsAt: '2026-10-05T17:00:00+05:30',
    durationMinutes: 60,
    status: 'completed',
    notes:
      'Discussed internal transfer vs. external TPM roles. Action items: shadow the PM on her current team for 4 weeks, write two product teardown docs, revisit in 30 days.',
    notesSubmitted: true,
  },
  {
    id: 'S025',
    candidateId: 'c-karan',
    sessionType: 'Skill-Gap Review',
    careerGoal: 'Leadership development',
    startsAt: '2026-10-04T15:00:00+05:30',
    durationMinutes: 60,
    status: 'completed',
    notesSubmitted: false,
  },
  {
    id: 'S024',
    candidateId: 'c-neha',
    sessionType: 'Career Counselling',
    careerGoal: 'Move into an HRBP role',
    startsAt: '2026-10-03T11:00:00+05:30',
    durationMinutes: 45,
    status: 'completed',
    notes: 'Mapped current HR generalist work to HRBP competencies. Next: resume rewrite before the review session.',
    notesSubmitted: true,
  },
  {
    id: 'S023',
    candidateId: 'c-arjun',
    sessionType: 'Career Strategy',
    careerGoal: 'Data Analyst to Data Scientist',
    startsAt: '2026-10-02T19:00:00+05:30',
    durationMinutes: 60,
    status: 'completed',
    notes: 'Agreed on a 3-month ML fundamentals plan and one end-to-end portfolio project.',
    notesSubmitted: true,
  },
  {
    id: 'S022',
    candidateId: 'c-sneha',
    sessionType: 'Mock Interview',
    careerGoal: 'Product Marketing Manager interview',
    startsAt: '2026-10-01T18:30:00+05:30',
    durationMinutes: 60,
    status: 'completed',
    notes: 'Good positioning answers; needs sharper go-to-market metrics. Shared a GTM case framework.',
    notesSubmitted: true,
  },
  {
    id: 'S021',
    candidateId: 'c-vikram',
    sessionType: 'Leadership Coaching',
    careerGoal: 'Step up to Program Director',
    startsAt: '2026-10-01T10:00:00+05:30',
    durationMinutes: 60,
    status: 'completed',
    notes: 'Worked on executive communication and portfolio-level reporting.',
    notesSubmitted: true,
  },
  {
    id: 'S020',
    candidateId: 'c-priya',
    sessionType: 'Profile Diagnostic',
    careerGoal: 'Transition to Product Management',
    startsAt: '2026-09-28T16:00:00+05:30',
    durationMinutes: 45,
    status: 'completed',
    notes: 'Initial diagnostic. Strong customer empathy; gaps in product analytics and prioritisation frameworks.',
    notesSubmitted: true,
  },
  {
    id: 'S019',
    candidateId: 'c-rahul',
    sessionType: 'Career Counselling',
    careerGoal: 'Product Manager interview',
    startsAt: '2026-09-24T18:00:00+05:30',
    durationMinutes: 60,
    status: 'completed',
    notes: 'Built a target company list and an interview prep calendar.',
    notesSubmitted: true,
  },
  {
    id: 'S018',
    candidateId: 'c-karan',
    sessionType: 'Career Counselling',
    careerGoal: 'Leadership development',
    startsAt: '2026-09-20T15:00:00+05:30',
    durationMinutes: 60,
    status: 'cancelled',
    notesSubmitted: false,
  },
];

export const MENTOR_PORTAL_SAMPLE_DATA: MentorPortalData = {
  isSample: true,
  mentor: {
    name: 'Harmanpreet Singh',
    title: 'Senior Product Leader & Career Mentor',
    email: 'harmanpreet.singh@example.com',
    expertise: ['Product Management', 'Career Transitions', 'Interview Preparation'],
  },
  // Headline numbers as an API summary would return them. "Total Sessions Conducted"
  // includes sessions older than the rows listed below.
  summary: {
    totalSessionsConducted: 24,
    completedThisMonth: 6,
    upcomingSessions: 3,
    assignedCandidates: 8,
  },
  candidates,
  sessions,
  availability: [
    { day: 'Monday', enabled: true, start: '18:00', end: '21:00' },
    { day: 'Tuesday', enabled: true, start: '18:00', end: '21:00' },
    { day: 'Wednesday', enabled: true, start: '16:00', end: '20:00' },
    { day: 'Thursday', enabled: true, start: '18:00', end: '21:00' },
    { day: 'Friday', enabled: true, start: '17:00', end: '20:00' },
    { day: 'Saturday', enabled: true, start: '10:00', end: '14:00' },
    { day: 'Sunday', enabled: false, start: '10:00', end: '13:00' },
  ],
};
