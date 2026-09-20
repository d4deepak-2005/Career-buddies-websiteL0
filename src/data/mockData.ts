import { COMPANY_CONFIG } from '../config/company';
import { 
  Mentor, 
  ServiceItem, 
  PlanItem, 
  FAQItem
} from '../types';

export const OFFICE_DETAILS = {
  name: "CareerBuddies Global Headquarters",
  address: "Samhita Spicewood West Block, 6th Main, GM Palya, CV Raman Nagar, Bengaluru, Karnataka – 560075",
  shortAddress: "CV Raman Nagar, Bengaluru, Karnataka – 560075",
  emails: [
    "nishant.sharma@careerbuddies.in",
    "deepak.sah@careerbuddies.in",
    "divyanshu.gautam@careerbuddies.in",
    "support@careerbuddies.in"
  ],
  primaryEmail: "nishant.sharma@careerbuddies.in",
  supportEmail: COMPANY_CONFIG.supportEmail,
  whatsappNumbers: [COMPANY_CONFIG.secondaryWhatsApp, COMPANY_CONFIG.primaryWhatsApp],
  primaryWhatsapp: COMPANY_CONFIG.primaryWhatsApp,
  secondaryWhatsapp: COMPANY_CONFIG.secondaryWhatsApp,
  whatsappLink: "https://wa.me/919310288270?text=Hi%20CareerBuddies%20team%2C%20I%20would%20like%20to%20know%20more%20about%20career%20counselling%20and%20mentorship."
};

export const STRUCTURED_SERVICES: ServiceItem[] = [
  {
    id: "s1",
    title: "Strategic Career Counseling & Roadmapping",
    shortDescription: "Tailored counseling sessions with industry leaders to map your 1-3 year career trajectory and remove career roadblocks.",
    fullDescription: "Gain clarity on your next major career pivot or leveling cycle. Work directly with senior practitioners from top-tier tech firms who analyze your skill profile, evaluate market demands, and create a structured 90-day execution roadmap.",
    category: "Career Strategy",
    iconName: "Compass",
    duration: "45-60 min per session",
    deliverables: [
      "Comprehensive Skill Gap Diagnostic Matrix",
      "Personalized 90-Day Milestones Action Plan",
      "Target Company Tiering & Strategy List",
      "Session Recording & Annotated Action Items"
    ],
    idealFor: ["Mid-to-Senior professionals planning their next leap", "Engineers & PMs feeling stuck in their current band"],
    keyOutcome: "Actionable clarity on leveling up with a step-by-step roadmap.",
    popular: true,
    badge: "Flagship"
  },
  {
    id: "s2",
    title: "Career Transition & Domain Pivot Guidance",
    shortDescription: "Navigate safe, high-leverage pivots across industries, tech stacks, or from IC to Management.",
    fullDescription: "Pivoting from Non-Tech to Tech, QA to Development, Backend to Applied AI, or IC to Engineering Management requires repositioning your transferable strengths. Our experienced mentors have walked this path and guide you through real portfolio proof-points.",
    category: "Career Strategy",
    iconName: "Shuffle",
    duration: "Structured 4-week Sprint",
    deliverables: [
      "Transferable Skills Positioning Audit",
      "Target Role Resume & LinkedIn Rebrand",
      "Portfolio Project Scope & Validation",
      "Transition Story Pitch & Framing"
    ],
    idealFor: ["Professionals switching domains (e.g. Non-tech to Tech, QA to Dev)", "Engineers shifting to Management"],
    keyOutcome: "Credible domain transition positioning and targeted portfolio.",
    popular: false
  },
  {
    id: "s3",
    title: "Resume, CV & LinkedIn Profile Optimization",
    shortDescription: "Transform your resume from a list of responsibilities into a compelling story of quantifiable business impact.",
    fullDescription: "Hiring managers and ATS filters scan resumes in less than 6 seconds. Mentors from Google, Meta, and Apple review your resume line-by-line using industry rubrics, rewriting bullet points for high signal and executive impact.",
    category: "Job Search",
    iconName: "FileCheck",
    duration: "2 Iterative Review Rounds",
    deliverables: [
      "Line-by-Line Content & Impact Rewriting",
      "ATS Scoring & Keyword Optimization",
      "LinkedIn Profile Hook & Headline Redesign",
      "Tailored Outreach Template for Recruiters"
    ],
    idealFor: ["Candidates applying for tier-1 tech & product companies", "Professionals receiving low recruiter response rates"],
    keyOutcome: "Top 2% ATS-optimized resume ready for FAANG/MNC applications.",
    popular: true,
    badge: "High Demand"
  },
  {
    id: "s4",
    title: "System Design & Distributed Architecture Mastery",
    shortDescription: "Master distributed systems, microservices, scalability, caching, and L5/L6 system design rounds.",
    fullDescription: "The System Design interview is the primary deciding factor for Senior and Staff engineering levels. Learn how to drive ambiguous requirements, evaluate trade-offs (CAP theorem, sharding, consensus), and present scalable architectures with confidence.",
    category: "Technical Prep",
    iconName: "Server",
    duration: "60 min Live Whiteboard Session",
    deliverables: [
      "Live Collaborative Architectural Diagramming",
      "Scored Rubric on Scalability, Fault Tolerance & Trade-offs",
      "Staff-level Technical Communication Feedback",
      "Curated System Design Cheatsheets & Reference Blueprints"
    ],
    idealFor: ["Senior & Staff Engineer interview candidates", "Tech leads architecting high-scale cloud systems"],
    keyOutcome: "Confidence in passing L5/L6 distributed system design interviews.",
    popular: true,
    badge: "Top Rated"
  },
  {
    id: "s5",
    title: "Technical Coding & Behavioral Mock Interviews",
    shortDescription: "Simulate high-pressure interviews with actual interviewers from top tech companies and receive scored feedback.",
    fullDescription: "Practice live DSA, problem-solving, and Amazon Leadership Principles / Googleyness behavioral questions with mentors who actually conduct hiring loops. Discover blind spots before your real on-sites.",
    category: "Interview Prep",
    iconName: "Code",
    duration: "60 min (45 min Mock + 15 min Feedback)",
    deliverables: [
      "Realistic Live Interview Simulation",
      "Comprehensive 5-Dimensional Performance Scorecard",
      "Algorithm Efficiency & Code Cleanliness Breakdown",
      "STAR Framework Behavioral Story Refinements"
    ],
    idealFor: ["Candidates with upcoming interview rounds", "Anyone experiencing interview anxiety or timing issues"],
    keyOutcome: "Objective assessment of readiness and tailored interview playbook.",
    popular: true
  },
  {
    id: "s6",
    title: "Executive Leadership & Stakeholder Alignment",
    shortDescription: "Develop executive presence, cross-functional diplomacy, strategic communication, and team leadership.",
    fullDescription: "Designed for Directors, VPs, and Engineering Managers navigating corporate politics, board presentations, budgeting, and high-stakes alignment with cross-functional leadership.",
    category: "Leadership",
    iconName: "Users",
    duration: "Bi-weekly Leadership Advisory",
    deliverables: [
      "Executive Presence & Communication Coaching",
      "Stakeholder Conflict Resolution Playbook",
      "Organizational Design & Delegation Framework",
      "High-Performance Culture Building Toolkit"
    ],
    idealFor: ["New and experienced Engineering Managers, Directors, VPs", "Founders managing growing executive teams"],
    keyOutcome: "Mastery over organizational influence and executive confidence.",
    popular: false
  },
  {
    id: "s7",
    title: "Salary Negotiation & Offer Leveling Strategy",
    shortDescription: "Maximize your compensation package, base salary, equity grants, and sign-on bonuses with proven scripts.",
    fullDescription: "Never leave money on the table. Our compensation advisors review your competing offers, evaluate equity terms (RSUs vs Options, vesting schedules), and write exact scripts to counter-offer effectively without risking the offer.",
    category: "Compensation",
    iconName: "TrendingUp",
    duration: "Offer Review & Real-time Scripting",
    deliverables: [
      "Market Percentile Compensation Benchmark Report",
      "Equity Valuation & Liquidity Risk Analysis",
      "Custom Word-for-Word Negotiation Email & Call Scripts",
      "Multiple Offer Leverage & Counter-Offer Strategy"
    ],
    idealFor: ["Candidates holding 1 or more job offers", "Professionals entering annual compensation review cycles"],
    keyOutcome: "Average compensation increase of 18% to 35% through structured negotiation.",
    popular: true,
    badge: "High ROI"
  },
  {
    id: "s8",
    title: "Promotion Packet & Performance Appraisal Review",
    shortDescription: "Structure quantifiable evidence of impact, executive sponsorship, and rubric fulfillment for your next promo.",
    fullDescription: "Getting promoted isn't just about hard work; it's about framing business impact according to company leveling rubrics. Work with mentors who serve on promotion committees to craft an undeniable promo document.",
    category: "Career Strategy",
    iconName: "Award",
    duration: "3 Packet Review Iterations",
    deliverables: [
      "Impact Artifact & Metric Quantification",
      "Leveling Matrix Gap Analysis",
      "Peer & Manager Sponsorship Alignment Strategy",
      "Self-Evaluation Narrative & Pitch Script"
    ],
    idealFor: ["Engineers & PMs aiming for Senior, Staff, or Lead roles", "Professionals preparing for annual/biannual appraisal cycles"],
    keyOutcome: "A polished, committee-ready promotion document backed by data.",
    popular: false
  },
  {
    id: "s9",
    title: "Zero-to-One Product Management Strategy",
    shortDescription: "Master customer discovery, PRD writing, North Star metric formulation, and go-to-market execution.",
    fullDescription: "Product Leaders from Stripe, Airbnb, and Uber guide you through end-to-end product thinking: identifying market opportunities, prioritizing roadmaps with RICE/MoSCoW, and leading high-velocity engineering teams.",
    category: "Product Management",
    iconName: "Lightbulb",
    duration: "Mentorship Track",
    deliverables: [
      "PRD Critique & Narrative Framework",
      "North Star & Guardrail Metrics Hierarchy",
      "Go-To-Market & Feature Launch Checklist",
      "Product Sense Case Study Solution Templates"
    ],
    idealFor: ["Associate PMs, Product Managers, and Tech Leads transitioning to PM", "Startup founders building early MVPs"],
    keyOutcome: "Elite product judgment and structured product artifacts.",
    popular: false
  },
  {
    id: "s10",
    title: "Machine Learning & Applied AI Transition",
    shortDescription: "Transition from software development or classical data science into modern Generative AI and LLM systems.",
    fullDescription: "Demystify LLMs, RAG architectures, model fine-tuning, vector databases, and MLOps. Learn from AI research scientists and practitioners building production AI at Meta and DeepMind.",
    category: "Technical Prep",
    iconName: "Cpu",
    duration: "Curated Technical Modules",
    deliverables: [
      "Applied AI & LLM Learning Pathway",
      "Production-Grade AI Architecture Project Review",
      "ML System Design Mock Interview",
      "Research Paper Reading & Implementation Guidance"
    ],
    idealFor: ["Software engineers pivoting into AI/ML engineering", "Data scientists upskilling in GenAI and agent workflows"],
    keyOutcome: "Hands-on competency in modern Applied AI architectures.",
    popular: true,
    badge: "Trending"
  },
  {
    id: "s11",
    title: "Technical Founder & Startup Advisory",
    shortDescription: "Architect resilient early tech stacks, hire your first 10 engineers, and prepare for investor technical diligence.",
    fullDescription: "Get strategic counsel from multi-time founders and CTOs on product-market fit velocity, avoiding premature optimization, setting up developer ergonomics, and surviving technical due diligence for Seed/Series A.",
    category: "Startup Advisory",
    iconName: "Rocket",
    duration: "Advisory Consultation",
    deliverables: [
      "MVP Architecture & Cloud Cost Optimization Audit",
      "Technical Hiring Rubric for Founding Engineers",
      "Due Diligence Readiness Checklist",
      "CTO/Founder Cadence & Roadmap Framework"
    ],
    idealFor: ["Early-stage technical and non-technical founders", "Founding engineers leading 0-to-1 buildouts"],
    keyOutcome: "Resilient tech foundations and streamlined investor readiness.",
    popular: false
  },
  {
    id: "s12",
    title: "Global Tech Placement & Relocation Guidance",
    shortDescription: "Crack international tech jobs, visa sponsorship criteria, and remote international compensation contracts.",
    fullDescription: "Learn how to land opportunities in the US (H1B/O1), UK/Europe (Tech Nation Visa), Canada, and Singapore. Mentors share firsthand playbooks on overseas recruiters, remote work tax regulations, and cultural adaptation.",
    category: "Global Career",
    iconName: "Globe",
    duration: "Strategy & Positioning Call",
    deliverables: [
      "Country-by-Country Tech Visa Landscape Analysis",
      "International Recruiter Outreach Strategy",
      "Global Relocation Compensation Adjustment Calculator",
      "Cross-Border Remote Work Contract Guidelines"
    ],
    idealFor: ["Professionals looking to relocate abroad", "Candidates seeking USD/EUR remote contracts"],
    keyOutcome: "Clear path to international tech employment and relocation.",
    popular: false
  }
];

export const CAREER_PLANS: PlanItem[] = [
  {
    id: "explore",
    name: "Explore Plan",
    tagline: "Career Discovery & Foundation",
    priceINR: "₹4,999",
    priceUSD: "$65",
    period: "one-time",
    description: "Perfect for professionals seeking diagnostic clarity, resume enhancement, and an actionable 90-day trajectory roadmap.",
    sessionsCount: "2 Focused 1:1 Sessions",
    supportType: "Email Support (14 Days)",
    bestFor: "Early to Mid-level professionals wanting quick diagnostic feedback.",
    badge: "Starter",
    features: [
      { title: "2 Intensive Master Guidance Sessions (45 min each)", included: true, detail: "Deep dive with a verified senior practitioner" },
      { title: "Comprehensive Resume & LinkedIn Audit", included: true, detail: "Line-by-line review and ATS scoring" },
      { title: "Personalized 90-Day Career Roadmap", included: true, detail: "Clear milestones tailored to your target role" },
      { title: "Target Company Tiering & Strategy", included: true },
      { title: "Mock Technical / Behavioral Interview", included: false },
      { title: "Live Salary Negotiation & Offer Review", included: false },
      { title: "Continuous WhatsApp / Slack Async Access", included: false },
      { title: "Lifelong Alumni Community Access", included: true }
    ]
  },
  {
    id: "elevate",
    name: "Elevate Plan",
    tagline: "Transformation & Leveling",
    priceINR: "₹14,999",
    priceUSD: "$185",
    period: "per 3-month program",
    isRecommended: true,
    description: "Our flagship holistic program designed to secure tier-1 job offers, crack high-stakes interviews, or earn your next major promotion.",
    sessionsCount: "6 Dedicated 1:1 Sessions",
    supportType: "Priority WhatsApp & Async Access",
    bestFor: "Engineers, PMs, and Designers actively interviewing or targeting senior promotions.",
    badge: "Most Popular • Recommended",
    features: [
      { title: "6 Dedicated Master Sessions with Top-Tier Mentor", included: true, detail: "Bi-weekly structured strategy and review" },
      { title: "Complete Resume, LinkedIn & Portfolio Rebuild", included: true, detail: "ATS-optimized rewriting for top tech" },
      { title: "2 Full Mock Interviews (System Design / DSA / PM)", included: true, detail: "With scored rubric and video playback" },
      { title: "Promotion Packet / Performance Review Strategy", included: true, detail: "Committee-proven framing of business impact" },
      { title: "Live Salary Negotiation & Counter-Offer Guidance", included: true, detail: "Word-for-word scripts & leverage playbook" },
      { title: "Weekly Async Check-ins & Code/Doc Reviews", included: true, detail: "Direct mentor messaging channel" },
      { title: "100% Satisfaction & Rematch Guarantee", included: true },
      { title: "Exclusive Hiring Referral Network Access", included: true }
    ]
  },
  {
    id: "excel",
    name: "Executive & Premium Plan",
    tagline: "Executive Mastery & Bespoke Leadership",
    priceINR: "Custom Plan",
    priceUSD: "Custom Plan",
    period: "tailored to your career profile",
    isCustomPricing: true,
    customPricingNote: "Get a personalised plan and fee structure based on your career profile and requirements.",
    description: "Elite, high-touch executive coaching for Staff/Principal Engineers, Engineering Managers, Directors, and Technical Founders.",
    sessionsCount: "12 Executive Master Sessions",
    supportType: "Direct 24/7 Dedicated Concierge",
    bestFor: "Senior leaders, engineering managers, directors, and ambitious startup founders.",
    badge: "Executive & Premium Tier",
    features: [
      { title: "12 Executive Master Sessions with VP/Director/Staff Mentor", included: true, detail: "Strategic advisory on org scale and leadership" },
      { title: "Executive Presence & Boardroom Alignment Coaching", included: true },
      { title: "Unlimited Mock Interviews & Packet Critiques", included: true, detail: "Complete prep across all hiring dimensions" },
      { title: "Full Compensation & Equity Package Negotiation", included: true, detail: "Direct advisor intervention on multi-tier offers" },
      { title: "Direct 24/7 WhatsApp Hotline with Lead Mentor", included: true },
      { title: "Custom Organizational Design & Team Scaling Playbook", included: true },
      { title: "Guaranteed Executive Network Introductions", included: true },
      { title: "VIP Access to Private Leader Masterminds", included: true }
    ]
  }
];

export const MOCK_MENTORS: Mentor[] = [
  {
    id: 'm1',
    name: 'Elena Rostova',
    title: 'Staff Software Engineer',
    company: 'Google',
    companyColor: '#4285F4',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    rating: 4.98,
    reviewCount: 84,
    sessionsCompleted: 142,
    hourlyRate: 85,
    experienceYears: 11,
    category: 'Engineering',
    bio: 'Distributed systems & cloud infrastructure specialist. Helped 30+ engineers reach Senior and Staff levels.',
    longBio: 'I am a Staff Engineer at Google with over a decade of experience designing hyper-scale distributed systems and Kubernetes infrastructure. Over the past 4 years on CareerBuddies, I have coached engineers through high-stakes system design interviews, promo packets, and cross-functional influence.',
    topics: ['System Design & Architecture', 'Promo Packets & Leveling', 'Staff Eng Archetypes', 'Mock Technical Interviews'],
    skills: ['Go', 'Distributed Systems', 'Cloud Arch', 'Kubernetes', 'Leadership'],
    verified: true,
    featured: true,
    superMentor: true,
    availableNext: 'Tomorrow, 2:00 PM',
    pastCompanies: ['Lyft', 'Amazon'],
    reviews: [
      {
        id: 'r1',
        author: 'Marcus Chen',
        role: 'Senior SWE at Stripe',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Elena helped me restructure my promotion pitch and system design approach. Her feedback was directly responsible for my L5 to L6 promotion.'
      },
      {
        id: 'r2',
        author: 'Sara Jenkins',
        role: 'Full-Stack Dev',
        rating: 5,
        date: '1 month ago',
        comment: 'The mock interview and distributed architecture breakdown were 10x better than any book or tutorial.'
      }
    ]
  },
  {
    id: 'm2',
    name: 'David K. Vance',
    title: 'VP of Product Management',
    company: 'Stripe',
    companyColor: '#635BFF',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    rating: 4.95,
    reviewCount: 112,
    sessionsCompleted: 210,
    hourlyRate: 110,
    experienceYears: 14,
    category: 'Product',
    bio: 'Former Head of Product at Fintech scaleups. Specializes in product strategy, PRDs, metrics, and executive leadership.',
    longBio: 'Passionate about building zero-to-one financial platforms and mentoring ambitious PMs to become product executives. Former Director at Square and current VP at Stripe. We will focus on outcome-driven roadmaps, stakeholder diplomacy, and product judgment.',
    topics: ['Product Strategy & Vision', 'PM Interview Frameworks', 'Stakeholder Management', '0 to 1 Launching'],
    skills: ['Product Discovery', 'Metrics & North Star', 'B2B SaaS', 'Fintech', 'Exec Comm'],
    verified: true,
    featured: true,
    superMentor: true,
    availableNext: 'Friday, 10:00 AM',
    pastCompanies: ['Square', 'Airbnb'],
    reviews: [
      {
        id: 'r3',
        author: 'Priya Sharma',
        role: 'Lead PM at Brex',
        rating: 5,
        date: '3 weeks ago',
        comment: 'David helped me refine our monetization metrics and transition to a Group PM role. Highly recommended!'
      }
    ]
  },
  {
    id: 'm3',
    name: 'Aiden Thorne',
    title: 'Principal Product Designer',
    company: 'Apple',
    companyColor: '#000000',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    rating: 4.97,
    reviewCount: 68,
    sessionsCompleted: 95,
    hourlyRate: 75,
    experienceYears: 9,
    category: 'Design',
    bio: 'Design systems and UX craftsmanship lead. Dedicated to elevating portfolios and design leadership storytelling.',
    longBio: 'Principal Designer at Apple working on hardware-software seamless interactions. I mentor designers on portfolio storytelling, interactive prototyping, cross-functional collaboration with engineering, and design system governance.',
    topics: ['Portfolio Deep-Dive & Critique', 'Design Systems at Scale', 'Storytelling for Execs', 'Figma & Prototyping'],
    skills: ['Design Systems', 'Interaction Design', 'Figma', 'UX Research', 'Design Leadership'],
    verified: true,
    featured: true,
    superMentor: false,
    availableNext: 'Today, 6:30 PM',
    pastCompanies: ['Figma', 'Uber'],
    reviews: [
      {
        id: 'r4',
        author: 'Chloe Dupont',
        role: 'Senior UI/UX Designer',
        rating: 5,
        date: '1 week ago',
        comment: 'Aiden gave me line-by-line portfolio feedback that landed me 3 on-site interviews within 10 days.'
      }
    ]
  },
  {
    id: 'm4',
    name: 'Dr. Sanjay Patel',
    title: 'Head of Machine Learning',
    company: 'Meta',
    companyColor: '#0668E1',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    rating: 4.99,
    reviewCount: 96,
    sessionsCompleted: 168,
    hourlyRate: 95,
    experienceYears: 12,
    category: 'Data & AI',
    bio: 'AI researcher and engineering leader specializing in LLMs, recommendation systems, and transitioning into Applied AI.',
    longBio: 'PhD in Computer Science from Stanford, leading generative AI research workflows at Meta. I guide data scientists and ML engineers transitioning from traditional predictive models to modern generative AI, agentic architectures, and research publications.',
    topics: ['LLMs & Agent Architectures', 'Transitioning to Applied AI', 'PhD to Industry Path', 'ML System Design'],
    skills: ['PyTorch', 'LLMs', 'MLOps', 'Transformers', 'Recommendation Engines'],
    verified: true,
    featured: true,
    superMentor: true,
    availableNext: 'Thursday, 4:00 PM',
    pastCompanies: ['DeepMind', 'Stanford AI Lab'],
    reviews: [
      {
        id: 'r5',
        author: 'Alexandre Roy',
        role: 'ML Engineer at Databricks',
        rating: 5,
        date: '5 days ago',
        comment: 'Sanjay’s insights on LLM fine-tuning and scaling laws saved our team months of trial and error.'
      }
    ]
  },
  {
    id: 'm5',
    name: 'Sarah Lindqvist',
    title: 'Director of Growth Marketing',
    company: 'Spotify',
    companyColor: '#1DB954',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    rating: 4.92,
    reviewCount: 53,
    sessionsCompleted: 88,
    hourlyRate: 70,
    experienceYears: 8,
    category: 'Marketing & Growth',
    bio: 'Product-led growth & acquisition expert. Scaled subscriptions from 50M to 200M+. Career coach for marketers.',
    longBio: 'Director at Spotify leading international user acquisition and lifecycle retention. Specializing in performance marketing, viral loops, experimentation frameworks, and marketing leadership.',
    topics: ['Product-Led Growth (PLG)', 'CAC & LTV Optimization', 'Marketing Org Scaling', 'Executive Presence'],
    skills: ['Growth Marketing', 'User Acquisition', 'Experimentation', 'Data Analytics', 'Brand Strategy'],
    verified: true,
    featured: false,
    superMentor: false,
    availableNext: 'Saturday, 11:00 AM',
    pastCompanies: ['Klarna', 'Duolingo'],
    reviews: [
      {
        id: 'r6',
        author: 'Hannah Morales',
        role: 'Growth Lead',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Sarah helped me establish our experimentation flywheel. Her frameworks are practical and immediately actionable.'
      }
    ]
  },
  {
    id: 'm6',
    name: 'Marcus Sterling',
    title: 'Chief Technology Officer',
    company: 'Scale AI',
    companyColor: '#000000',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    rating: 4.96,
    reviewCount: 78,
    sessionsCompleted: 135,
    hourlyRate: 125,
    experienceYears: 16,
    category: 'Leadership',
    bio: 'Multi-time founder & tech executive. Mentors senior managers, VPs, and founders on engineering culture and team scaling.',
    longBio: 'CTO and serial tech founder with 2 exits. Mentoring VP of Engineering candidates, directors, and technical founders on organizational design, executive board communication, and navigating hyper-growth without burning out your team.',
    topics: ['Engineering Org Design', 'Executive Board Alignment', 'Founder to CTO Evolution', 'Crisis Leadership'],
    skills: ['Org Strategy', 'Hiring at Scale', 'Fundraising Prep', 'Tech Strategy', 'People Mgmt'],
    verified: true,
    featured: true,
    superMentor: true,
    availableNext: 'Monday, 1:00 PM',
    pastCompanies: ['Y Combinator Alumni', 'Twitter'],
    reviews: [
      {
        id: 'r7',
        author: 'Daniel Vance',
        role: 'Founder & CEO',
        rating: 5,
        date: '1 month ago',
        comment: 'Marcus’s advice on executive hiring and technical debt management was invaluable during our Series B round.'
      }
    ]
  }
];

export const MOCK_FAQS: FAQItem[] = [
  {
    id: 'faq1',
    category: 'general',
    question: 'How does CareerBuddies mentorship work?',
    answer: 'CareerBuddies operates on a proven 7-step practitioner-led methodology. It starts with an accessible ₹199 live masterclass webinar led by senior mentors. Interested learners then connect with a dedicated Career Advisor who analyzes their requirements and matches them with one of our three structured Career Plans. Upon enrolment, our specialized team overhauls your resume and portfolio, culminating in a 1:1 Personalized Master Session.'
  },
  {
    id: 'faq2',
    category: 'mentees',
    question: 'How do I choose between the 3 Career Plans?',
    answer: 'After attending your ₹199 live webinar, our Career Advisor conducts a 1:1 requirements review to analyze your experience level, transition goals, and target timeline. They will recommend either the Foundation & Growth Sprint, the Career Transition & Switch Track, or the Executive & Leadership Mastery track.'
  },
  {
    id: 'faq3',
    category: 'mentees',
    question: 'Are mentorship sessions covered by a guarantee?',
    answer: 'Yes, 100%! If your first session with any mentor is anything less than transformative, we will immediately rematch you with another mentor or issue a full refund within 48 hours. No questions asked.'
  },
  {
    id: 'faq4',
    category: 'mentors',
    question: 'How are CareerBuddies mentors vetted and selected?',
    answer: 'Every mentor undergoes rigorous verification including active senior employment at leading companies (Google, Stripe, Apple, Meta, etc.), verified leadership track record, and a trial mentorship session checking for empathy, communication clarity, and actionable guidance.'
  },
  {
    id: 'faq5',
    category: 'billing',
    question: 'Can my employer sponsor my CareerBuddies program?',
    answer: 'Yes! Over 60% of our mentees utilize their company Learning & Development (L&D) budget. We provide itemized corporate invoices, tax receipts, and formal program completion certificates.'
  },
  {
    id: 'faq6',
    category: 'general',
    question: 'Where is CareerBuddies located?',
    answer: 'Our global headquarters is at Samhita Spicewood West Block, 6th Main, GM Palya, CV Raman Nagar, Bengaluru, Karnataka - 560075, with mentors based across San Francisco, London, Singapore, and India.'
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Join a Mentor-Led Webinar",
    subtitle: "Start your journey with a live masterclass (Entry Fee: ₹199)",
    description: "Start your journey by attending a live mentor-led webinar or masterclass conducted by senior practitioners from top companies covering real-world tech, product, and leadership topics.",
    icon: "Target",
    deliverable: "₹199 Webinar Pass, Live Q&A & Resource Pack"
  },
  {
    step: 2,
    title: "Connect with Our Advisor",
    subtitle: "Understand your profile, requirements & career goals",
    description: "Genuinely interested candidates are contacted by a dedicated CareerBuddies Advisor who analyzes your professional profile, current role, total work experience, career requirements, and long-term goals.",
    icon: "Compass",
    deliverable: "1-on-1 Profile & Career Goals Diagnostic"
  },
  {
    step: 3,
    title: "Choose the Right Plan",
    subtitle: "Advisor-recommended pathway matching your profile",
    description: "Based on the candidate's profile and specific requirements, the Advisor recommends the most suitable option from the available CareerBuddies plans.",
    icon: "Search",
    deliverable: "Tailored Plan Recommendation & Growth Roadmap"
  },
  {
    step: 4,
    title: "Profile-Focused Support",
    subtitle: "Dedicated teams work directly on your career profile",
    description: "After enrollment, dedicated CareerBuddies teams work systematically on the candidate's profile according to the purchased plan—including ATS resume optimization, LinkedIn presence, and portfolio enhancement.",
    icon: "Sparkles",
    deliverable: "Targeted Profile Enhancement & Deliverables"
  },
  {
    step: 5,
    title: "Personalized Master Session",
    subtitle: "Deep-dive session with an industry mentor in following week",
    description: "In the following week, candidates participate in a more personalized Master Session with the same mentor or another relevant available industry mentor to align strategy and execution.",
    icon: "Rocket",
    deliverable: "Personalized Master Session & 90-Day Execution Blueprint"
  }
];
