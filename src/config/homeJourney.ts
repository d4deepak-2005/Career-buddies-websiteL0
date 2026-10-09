export interface HomeJourneyStage {
  title: string;
  badge: string;
  desc: string;
}

export const DEFAULT_HOME_JOURNEY = {
  eyebrow: 'THE REAL 7-STAGE JOURNEY',
  title: 'How CareerBuddies Accelerates Your Career',
  description:
    'A structured, transparent pathway from your first live mentor masterclass to dedicated profile overhaul and personalized master sessions.',
  ctaEyebrow: 'The Complete Journey',
  ctaTitle: 'Ready to Start at Step 1?',
  ctaDescription: 'Join our next live mentor webinar to learn directly from leading industry practitioners.',
  moreText: 'View Detailed 7-Stage Methodology',
  stages: [
    {
      title: 'Live Mentor Webinar',
      badge: 'Start Here',
      desc: 'Start with an affordable 90-minute live masterclass led by senior mentors from top tech companies.',
    },
    {
      title: 'Express Interest',
      badge: 'Next Step',
      desc: 'Genuinely interested professionals continue their journey and request a personalized strategy conversation.',
    },
    {
      title: 'Advisor Discussion',
      badge: 'Requirement Stage',
      desc: 'A dedicated Career Advisor analyzes your background, current challenges, and goals to recommend the right plan.',
    },
    {
      title: 'Choose Your Plan',
      badge: 'Tailored Options',
      desc: 'Select the most suitable plan (Foundation Sprint, Transition Track, or Executive Mastery) for your career stage.',
    },
    {
      title: 'Programme Enrolment',
      badge: 'Onboarding',
      desc: 'Formally enrol in your chosen programme to unlock dedicated team resources and milestone tracking.',
    },
    {
      title: 'Dedicated Profile Work',
      badge: 'Hands-on',
      desc: 'Our specialized team completely overhauls your ATS resume, LinkedIn profile, and portfolio assets.',
    },
    {
      title: 'Personalized Master Session',
      badge: 'Personalized Master Session',
      desc: 'In the following week, engage in an in-depth master session with a verified practitioner matched to your domain.',
    },
  ] as HomeJourneyStage[],
};
