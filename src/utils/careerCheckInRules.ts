import { Mentor, ResourceArticle } from '../types';

// Transparent, rule-based Career Check-in result. Nothing here is AI: the answers pick fixed
// guidance sentences, and the mentors / playbooks suggested are the ones whose own topics, skills or
// titles contain the keywords tied to the answers. Everything shown can be traced back to an answer.

export interface CheckInAnswers {
  stage: string;
  direction: string;
  challenge: string;
  support: string;
}

// Words that connect an answer to mentor topics / playbook titles.
const CHALLENGE_KEYWORDS: Record<string, string[]> = {
  direction: ['career', 'strategy', 'roadmap', 'vision', 'clarity'],
  system_design: ['system design', 'architecture', 'distributed', 'scale'],
  resumes: ['resume', 'portfolio', 'interview', 'ats'],
  transition: ['transition', 'pivot', 'switch', 'change'],
  salary: ['salary', 'compensation', 'negotiation', 'leveling', 'promotion', 'equity'],
};

const DIRECTION_KEYWORDS: Record<string, string[]> = {
  exploring: ['career', 'strategy', 'clarity'],
  switching: ['transition', 'pivot', 'switch'],
  growing: ['promotion', 'leveling', 'leadership', 'growth'],
  interviewing: ['interview', 'system design', 'behavioral', 'negotiation'],
};

const STAGE_ADVICE: Record<string, string> = {
  student: 'At the start of a career, a clear first target role and a focused profile usually matter most.',
  early: 'In the first few years, strengthening fundamentals and choosing a direction early compounds quickly.',
  mid: 'At mid-career, the biggest gains tend to come from a deliberate move up in scope or a well-planned change of track.',
  senior: 'At senior level, progress is mostly about scope, visibility and leadership rather than more technical depth.',
};

const CHALLENGE_ADVICE: Record<string, string> = {
  direction: 'Since you feel unsure about direction, start with an honest conversation about options before committing to a plan.',
  system_design: 'Since system design is your blocker, structured practice with someone who has run those interviews or designs helps most.',
  resumes: 'Since applications are not converting, a profile and resume review is usually the fastest fix to test.',
  transition: 'Since you are facing a skill or stack pivot, a concrete transition plan with proof-of-work is the priority.',
  salary: 'Since compensation and levelling are stuck, benchmark data and a negotiation or promotion strategy come first.',
};

const SUPPORT_LABEL: Record<string, string> = {
  '1on1': 'ongoing 1:1 sessions with a mentor',
  webinars: 'a live masterclass or webinar',
  counselling: 'a free diagnostic counselling call',
  resources: 'self-paced playbooks',
};

export type ActionId = 'counselling' | 'mentors' | 'webinars' | 'resources';

// Which of the four actions matches the support style the person picked.
const PREFERRED_ACTION: Record<string, ActionId> = {
  '1on1': 'mentors',
  webinars: 'webinars',
  counselling: 'counselling',
  resources: 'resources',
};

export interface CheckInResult {
  summary: string;
  reasons: string[];
  preferredAction: ActionId;
  mentorMatches: Mentor[];
  articleMatches: ResourceArticle[];
  mentorTotal: number;
}

const count = (haystack: string, words: string[]) => words.filter((w) => haystack.includes(w)).length;

export function buildCheckInResult(
  answers: CheckInAnswers,
  titles: { stage?: string; direction?: string; challenge?: string },
  mentors: Mentor[],
  articles: ResourceArticle[]
): CheckInResult {
  const words = [...(CHALLENGE_KEYWORDS[answers.challenge] || []), ...(DIRECTION_KEYWORDS[answers.direction] || [])];

  const mentorMatches = mentors
    .map((mentor) => ({
      mentor,
      score: count([...(mentor.topics || []), ...(mentor.skills || [])].join(' ').toLowerCase(), words),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.mentor.rating || 0) - (a.mentor.rating || 0))
    .slice(0, 3)
    .map((entry) => entry.mentor);

  const articleMatches = articles
    .map((article) => ({
      article,
      score: count(`${article.title} ${article.categoryName} ${(article.tags || []).join(' ')}`.toLowerCase(), words),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.article);

  const support = SUPPORT_LABEL[answers.support] || 'guidance';
  const summary = [
    `You are at the "${titles.stage || 'selected'}" stage, your direction is "${titles.direction || 'selected'}", and your main blocker is "${titles.challenge || 'selected'}".`,
    STAGE_ADVICE[answers.stage] || '',
    CHALLENGE_ADVICE[answers.challenge] || '',
    `You said you would prefer ${support}, so that option is listed first below.`,
  ]
    .filter(Boolean)
    .join(' ');

  const reasons = [
    `Blocker "${titles.challenge || ''}" → suggestions are chosen by the keywords: ${(CHALLENGE_KEYWORDS[answers.challenge] || []).slice(0, 4).join(', ')}.`,
    `Direction "${titles.direction || ''}" → also matched on: ${(DIRECTION_KEYWORDS[answers.direction] || []).join(', ')}.`,
    `Support preference → ${support} is shown first.`,
  ];

  return {
    summary,
    reasons,
    preferredAction: PREFERRED_ACTION[answers.support] || 'counselling',
    mentorMatches,
    articleMatches,
    mentorTotal: mentors.length,
  };
}
