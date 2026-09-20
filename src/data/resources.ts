import { ResourceCategory, ResourceArticle } from '../types';

// Career playbook articles and categories (used only by the Resources page and article reader).
export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: "cat-resume",
    title: "Resume & Portfolio Mastery",
    description: "High-signal resume templates, ATS optimization, and portfolio storytelling frameworks.",
    count: 3,
    icon: "FileText"
  },
  {
    id: "cat-interview",
    title: "Interview Preparation & Mocks",
    description: "System design blueprints, behavioral STAR frameworks, and coding interview strategies.",
    count: 3,
    icon: "Code"
  },
  {
    id: "cat-transition",
    title: "Career Transitions & Pivots",
    description: "Guides on pivoting into tech, shifting to product, or transitioning from IC to management.",
    count: 3,
    icon: "Shuffle"
  },
  {
    id: "cat-leadership",
    title: "Leadership & Management",
    description: "Executive communication, stakeholder alignment, team performance, and org design.",
    count: 3,
    icon: "Users"
  },
  {
    id: "cat-sysdesign",
    title: "System Design & Architecture",
    description: "Distributed architectures, microservices, database sharding, and scalability patterns.",
    count: 3,
    icon: "Server"
  },
  {
    id: "cat-product",
    title: "Product & Strategy",
    description: "PRD writing, North Star metrics, customer discovery, and product judgment frameworks.",
    count: 3,
    icon: "Lightbulb"
  },
  {
    id: "cat-salary",
    title: "Salary & Compensation",
    description: "Negotiation scripts, equity (RSUs/Options) breakdowns, and offer evaluation tools.",
    count: 3,
    icon: "TrendingUp"
  },
  {
    id: "cat-stories",
    title: "Career Stories & Case Studies",
    description: "Real-world breakdowns of professionals who achieved 2x-3x career leaps with mentorship.",
    count: 3,
    icon: "BookOpen"
  }
];

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  // 1. Resume & Portfolio
  {
    id: "art-1",
    categoryId: "cat-resume",
    categoryName: "Resume & Portfolio Mastery",
    title: "The Google XYZ Formula: Transforming Task Bullet Points into Quantifiable Impact",
    readTime: "6 min read",
    publishedDate: "June 2026",
    summary: "How Google recruiters evaluate resumes and how you can apply the 'Accomplished [X], as measured by [Y], by doing [Z]' rubric to stand out.",
    tags: ["Resume", "Hiring Rubric", "Google", "Impact Framing"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### Why Most Resumes Get Rejected in 6 Seconds
Recruiters review hundreds of resumes daily. If your resume reads like a job description ("Responsible for building microservices in Go"), you are immediately grouped into the bottom 80%. Hiring managers look for *business impact*, *ownership scope*, and *measurable metrics*.

### The Proven Google XYZ Formula
Google's Laszlo Bock established the gold standard for resume bullet points:
> **"Accomplished [X], as measured by [Y], by doing [Z]."**

#### Example 1: Software Engineer
* **Weak:** Worked on optimizing database query latency for the checkout service.
* **Strong:** Reduced 99th percentile checkout API latency by 42% (from 850ms to 490ms), as measured by Datadog APM, by introducing Redis multi-tier caching and query index sharding.

#### Example 2: Product Manager
* **Weak:** Managed the rollout of our new mobile onboarding flow.
* **Strong:** Increased user onboarding conversion by 28% and reduced Day-7 churn by 14%, as measured by Mixpanel funnel telemetry, by architecting a streamlined 3-step progressive onboarding funnel.

### Checklist for Your Next Resume Revision
1. **Remove generic adjectives:** Kill words like "hard-working", "detail-oriented", or "dynamic". Let your metrics speak.
2. **Lead with action verbs:** Architected, spearhead, scaled, automated, reduced, generated.
3. **Always anchor the metric:** Time saved, revenue generated, latency reduced, or adoption rate achieved.
    `
  },
  {
    id: "art-2",
    categoryId: "cat-resume",
    categoryName: "Resume & Portfolio Mastery",
    title: "How to Build a Design Portfolio that Lands Tier-1 UX Interviews",
    readTime: "7 min read",
    publishedDate: "May 2026",
    summary: "Senior design managers don't just want pretty screens; they look for problem validation, cross-functional trade-offs, and user research rigor.",
    tags: ["Design", "Portfolio", "Case Study", "UX Research"],
    author: "Aiden Thorne",
    authorRole: "Principal Product Designer @ Apple",
    content: `
### The 3 Things Design Directors Actually Look For
When reviewing candidate portfolios for Senior and Principal roles, UI polish is baseline. The true differentiator is *product thinking* and *decision rationale*.

1. **The 'Why' Behind the Pivot:** What hypotheses failed during user testing? How did feedback change your direction?
2. **Engineering Collaboration:** How did you accommodate technical constraints or API performance trade-offs?
3. **Business Metrics:** Did the feature move active usage, reduce customer support tickets, or increase checkout conversion?

### The 4-Section Case Study Structure
* **Section 1: The Core Problem & Constraints:** Define the user pain point and success metric in 2 paragraphs.
* **Section 2: Discovery & Iterations:** Show early low-fidelity wireframes and the dead ends you discarded.
* **Section 3: The Final Solution & Micro-Interactions:** High-fidelity interactive prototypes and design system tokens.
* **Section 4: Measured Impact & Retrospective:** What were the results, and what would you do differently with 6 more months?
    `
  },
  {
    id: "art-3",
    categoryId: "cat-resume",
    categoryName: "Resume & Portfolio Mastery",
    title: "LinkedIn Algorithm Secrets: Getting 5+ Inbound Recruiter Messages Weekly",
    readTime: "5 min read",
    publishedDate: "June 2026",
    summary: "Optimize your LinkedIn headline, skills section, and open-to-work settings to rank at the top of LinkedIn Recruiter searches.",
    tags: ["LinkedIn", "Personal Brand", "Inbound Leads", "Job Search"],
    author: "Sarah Lindqvist",
    authorRole: "Director of Growth @ Spotify",
    content: `
### How LinkedIn Recruiter Search Works
Recruiters use Boolean search queries (e.g. \`"Staff Software Engineer" AND "Distributed Systems" AND ("Go" OR "Java")\`). If your headline or experience section is missing these exact keywords, your profile will never appear on the first 3 pages of search results.

### The Anatomy of a High-Converting Profile
* **Headline:** [Target Role] | [Core Technical Focus / Stack] | Ex-[Recognizable Company] | Helping [Target Outcome]
* **About Section:** Write in first person. Highlight your philosophy, 3 key career achievements with metrics, and invite conversation.
* **Skills Section:** Pin your top 3 core skills and ensure you have endorsements from peers.
    `
  },

  // 2. Interview Prep
  {
    id: "art-4",
    categoryId: "cat-interview",
    categoryName: "Interview Preparation & Mocks",
    title: "Mastering the Behavioral STAR Method for FAANG Leadership Principles",
    readTime: "8 min read",
    publishedDate: "June 2026",
    summary: "A step-by-step breakdown of how to structure high-impact answers for 'Tell me about a time when you disagreed with leadership' without sounding combative.",
    tags: ["Behavioral Interview", "STAR Method", "Leadership Principles", "Amazon"],
    author: "David K. Vance",
    authorRole: "VP of Product @ Stripe",
    content: `
### Why Great Engineers Fail Behavioral Rounds
Many technical candidates prepare 100 hours for coding and zero hours for behavioral rounds. In senior loops, behavioral answers determine whether you are leveled as L4, L5, or L6.

### The 4-Part STAR Structure
1. **Situation (15% of time):** Context, team size, timeline, and stakes. Keep it brief.
2. **Task (10% of time):** What was your specific responsibility? Avoid "we", use "I".
3. **Action (60% of time):** The exact steps you took, technical or diplomatic decisions made, and how you unblocked others.
4. **Result (15% of time):** The quantifiable business outcome, lessons learned, and long-term impact.
    `
  },
  {
    id: "art-5",
    categoryId: "cat-interview",
    categoryName: "Interview Preparation & Mocks",
    title: "How to Structure a 45-Minute System Design Interview",
    readTime: "9 min read",
    publishedDate: "May 2026",
    summary: "The exact 6-step time management template used by Staff Engineers to design distributed systems under pressure.",
    tags: ["System Design", "Scalability", "Architecture", "Interview Prep"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### Time Allocation Matrix
* **00:00 - 05:00:** Clarify Functional & Non-Functional Requirements (Latency, Availability, Scale).
* **05:00 - 10:00:** Back-of-the-Envelope Calculations (QPS, Storage, Bandwidth).
* **10:00 - 20:00:** High-Level Architecture & Core Data Models.
* **20:00 - 35:00:** Deep Dive into Bottlenecks & Edge Cases (Caching, Partitioning, Replication).
* **35:00 - 45:00:** Trade-off Analysis & Future Scaling Considerations.
    `
  },
  {
    id: "art-6",
    categoryId: "cat-interview",
    categoryName: "Interview Preparation & Mocks",
    title: "Overcoming Interview Anxiety: The Mental Reframe for High-Stakes Loops",
    readTime: "5 min read",
    publishedDate: "April 2026",
    summary: "Psychological strategies to stop second-guessing yourself and treat technical interviews as collaborative design conversations.",
    tags: ["Mindset", "Anxiety", "Confidence", "Interview Coaching"],
    author: "Marcus Sterling",
    authorRole: "CTO @ Scale AI",
    content: `
### Reframe: From 'Being Examined' to 'Collaborative Whiteboarding'
The biggest cause of interview freezing is treating the interviewer as a gatekeeper testing you for failure. In reality, interviewers want you to succeed—hiring is expensive and exhausting. Treat the session as two engineers solving a production outage together.
    `
  },

  // 3. Career Transition
  {
    id: "art-7",
    categoryId: "cat-transition",
    categoryName: "Career Transitions & Pivots",
    title: "From Individual Contributor to Engineering Manager: The First 90 Days",
    readTime: "7 min read",
    publishedDate: "June 2026",
    summary: "How to let go of writing code daily, build psychological trust with former peers, and align team output with company goals.",
    tags: ["Engineering Management", "Transition", "Leadership", "1:1s"],
    author: "Marcus Sterling",
    authorRole: "CTO @ Scale AI",
    content: `
### The Hardest Shift: Letting Go of the IDE
As an IC, your value is measured in pull requests and code commits. As an EM, your value is measured in unblocking your team, setting clear roadmaps, and shielding engineers from organizational noise.
    `
  },
  {
    id: "art-8",
    categoryId: "cat-transition",
    categoryName: "Career Transitions & Pivots",
    title: "Pivoting from Non-Tech to Product Management: The Transferable Skills Playbook",
    readTime: "8 min read",
    publishedDate: "May 2026",
    summary: "How consultants, business analysts, and operations leads can successfully pitch their background for Tier-1 Associate PM and PM roles.",
    tags: ["Product Management", "Career Pivot", "Transferable Skills", "APM"],
    author: "David K. Vance",
    authorRole: "VP of Product @ Stripe",
    content: `
### The 3 Core Pillars of PM Credibility
1. **User Empathy & Problem Definition:** Showing you can listen to customer pain without jumping prematurely to solutions.
2. **Data Fluency:** Translating SQL queries and user metrics into strategic roadmap decisions.
3. **Execution Velocity:** Delivering cross-functional projects on time with minimal drama.
    `
  },
  {
    id: "art-9",
    categoryId: "cat-transition",
    categoryName: "Career Transitions & Pivots",
    title: "Switching from Traditional Software Engineering to Applied AI & LLMs",
    readTime: "10 min read",
    publishedDate: "June 2026",
    summary: "The practical developer roadmap for mastering embeddings, vector databases, LangChain/LlamaIndex, and LLM evaluation benchmarks.",
    tags: ["AI", "LLMs", "Machine Learning", "Upskilling"],
    author: "Dr. Sanjay Patel",
    authorRole: "Head of Machine Learning @ Meta",
    content: `
### Do You Need a PhD in Math to Work in Applied AI?
No. While fundamental linear algebra helps, the vast majority of high-paying AI engineering roles focus on *orchestration, evaluation, fine-tuning, and low-latency inference pipelines*.
    `
  },

  // 4. Leadership & Management
  {
    id: "art-10",
    categoryId: "cat-leadership",
    categoryName: "Leadership & Management",
    title: "The Art of Managing Up: Aligning with Directors and Executive Leadership",
    readTime: "6 min read",
    publishedDate: "May 2026",
    summary: "How to communicate technical risk, ask for resources, and present status updates that build immediate executive trust.",
    tags: ["Managing Up", "Executive Presence", "Communication", "Leadership"],
    author: "David K. Vance",
    authorRole: "VP of Product @ Stripe",
    content: `
### The 1-Page Executive Memo Framework
Executives do not have time to read 15-page PRDs. Learn to synthesize complex technical architectures into a 1-page memo outlining: The Decision Required, Business Context, 3 Options Evaluated with Pros/Cons, and Your Recommendation.
    `
  },
  {
    id: "art-11",
    categoryId: "cat-leadership",
    categoryName: "Leadership & Management",
    title: "Building High-Trust 1:1 Meetings with Your Direct Reports",
    readTime: "7 min read",
    publishedDate: "April 2026",
    summary: "Stop using 1:1s for status updates. Use these 10 powerful questions to unlock retention, motivation, and career growth.",
    tags: ["1:1 Meetings", "People Management", "Trust", "Retention"],
    author: "Marcus Sterling",
    authorRole: "CTO @ Scale AI",
    content: `
### The 10/10/10 Rule for 1:1s
* First 10 Minutes: The report's agenda and personal check-in.
* Second 10 Minutes: Manager's strategic context and coaching.
* Final 10 Minutes: Long-term career goals and mutual feedback.
    `
  },
  {
    id: "art-12",
    categoryId: "cat-leadership",
    categoryName: "Leadership & Management",
    title: "Navigating Organizational Politics Without Compromising Your Integrity",
    readTime: "8 min read",
    publishedDate: "March 2026",
    summary: "How to build cross-functional alliances, navigate resource contention, and advocate for your team with diplomacy.",
    tags: ["Diplomacy", "Corporate Strategy", "Alliances", "Leadership"],
    author: "Sarah Lindqvist",
    authorRole: "Director of Growth @ Spotify",
    content: `
### Organizational Politics is Just Human Alignment
Politics occurs whenever two teams have competing OKRs. By understanding the other team's incentive structures, you can propose win-win compromises before escalation meetings.
    `
  },

  // 5. System Design & Architecture
  {
    id: "art-13",
    categoryId: "cat-sysdesign",
    categoryName: "System Design & Architecture",
    title: "Distributed Caching Strategies: Redis, Memcached, and Cache Invalidation",
    readTime: "9 min read",
    publishedDate: "June 2026",
    summary: "Cache-Aside, Write-Through, Write-Behind, and dealing with cache stampedes in high-throughput applications.",
    tags: ["Redis", "Distributed Systems", "Caching", "Performance"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### The 2 Hard Things in Computer Science: Cache Invalidation
Caching is the most effective lever for reducing database load, but incorrect invalidation leads to stale data and catastrophic bugs. Here is how to implement TTL jitter, mutex locks, and CDC-based cache warming.
    `
  },
  {
    id: "art-14",
    categoryId: "cat-sysdesign",
    categoryName: "System Design & Architecture",
    title: "Database Sharding vs. Partitioning: Scaling from 10M to 500M Records",
    readTime: "11 min read",
    publishedDate: "May 2026",
    summary: "Choosing between horizontal sharding, consistent hashing, range-based partitions, and evaluating distributed SQL options.",
    tags: ["Database", "Sharding", "Scalability", "PostgreSQL"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### When NOT to Shard
Premature sharding introduces cross-node transactions and operational nightmare. Before sharding, exhaust vertical scaling, read replicas, index optimization, and table partitioning.
    `
  },
  {
    id: "art-15",
    categoryId: "cat-sysdesign",
    categoryName: "System Design & Architecture",
    title: "Designing Event-Driven Architectures with Kafka and RabbitMQ",
    readTime: "8 min read",
    publishedDate: "April 2026",
    summary: "Event streaming patterns, idempotent consumer design, dead-letter queues, and exactly-once processing semantics.",
    tags: ["Kafka", "Event-Driven", "Microservices", "Messaging"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### Decoupling Microservices with Event Logs
How to prevent cascading failures across distributed microservices by transitioning synchronous REST calls into durable Kafka event streams.
    `
  },

  // 6. Product & Strategy
  {
    id: "art-16",
    categoryId: "cat-product",
    categoryName: "Product & Strategy",
    title: "How to Write PRDs that Engineers Actually Love Reading",
    readTime: "7 min read",
    publishedDate: "June 2026",
    summary: "Eliminate ambiguity and align engineering on the problem statement, user personas, acceptance criteria, and edge cases.",
    tags: ["PRD", "Product Management", "Engineering Alignment", "Specs"],
    author: "David K. Vance",
    authorRole: "VP of Product @ Stripe",
    content: `
### Structure Over Length
A great PRD is not 30 pages of specs. It is a crisp document defining: 1. Target Problem & Success Metrics, 2. Non-Goals, 3. User Flows & Wireframes, 4. Technical Constraints, and 5. Open Questions.
    `
  },
  {
    id: "art-17",
    categoryId: "cat-product",
    categoryName: "Product & Strategy",
    title: "Product-Led Growth: Designing Organic Viral Loops and Self-Serve Onboarding",
    readTime: "8 min read",
    publishedDate: "May 2026",
    summary: "How products like Figma, Slack, and Notion drive multi-million ARR with low CAC through product-driven network effects.",
    tags: ["PLG", "Growth", "Retention", "Virality"],
    author: "Sarah Lindqvist",
    authorRole: "Director of Growth @ Spotify",
    content: `
### The 3 Stages of the PLG Funnel
1. The 'Aha!' Moment: Delivering initial value within 60 seconds of sign-up.
2. The Habit Loop: Embedding the tool into daily team collaboration workflows.
3. The Expansion Trigger: Driving organic seat upgrades through shared workspace features.
    `
  },
  {
    id: "art-18",
    categoryId: "cat-product",
    categoryName: "Product & Strategy",
    title: "Defining North Star Metrics Without Falling for Vanity Indicators",
    readTime: "6 min read",
    publishedDate: "April 2026",
    summary: "How to select a primary metric that reflects genuine customer value and aligns product, design, and engineering.",
    tags: ["Metrics", "Analytics", "Strategy", "KPIs"],
    author: "David K. Vance",
    authorRole: "VP of Product @ Stripe",
    content: `
### Good vs. Bad North Star Metrics
* Bad: Total Registered Users (measures marketing spend, not engagement).
* Good: Weekly Active Teams Creating 3+ Documents (measures core product utility).
    `
  },

  // 7. Salary & Compensation
  {
    id: "art-19",
    categoryId: "cat-salary",
    categoryName: "Salary & Compensation",
    title: "The Step-by-Step Salary Negotiation Script for Senior Tech Offers",
    readTime: "8 min read",
    publishedDate: "June 2026",
    summary: "Exact word-for-word scripts for counter-offering on base salary, signing bonuses, and RSU equity without risking the offer.",
    tags: ["Salary Negotiation", "Compensation", "RSUs", "Job Offers"],
    author: "Marcus Sterling",
    authorRole: "CTO @ Scale AI",
    content: `
### The 3 Golden Rules of Offer Negotiation
1. **Never Give the First Number:** If asked for your current salary, pivot to market expectations for the target role.
2. **Always Negotiate in Writing:** Email allows you to control the tone, present data, and avoid nervous verbal concessions.
3. **Anchor with Competing Value:** Frame your counter-offer around market percentiles, specialized domain expertise, and competing timelines.
    `
  },
  {
    id: "art-20",
    categoryId: "cat-salary",
    categoryName: "Salary & Compensation",
    title: "Demystifying Startup Equity: RSUs vs. Stock Options vs. Liquidity Events",
    readTime: "9 min read",
    publishedDate: "May 2026",
    summary: "How to evaluate strike prices, 409A valuations, preference overhangs, and vesting cliffs before joining a startup.",
    tags: ["Equity", "Stock Options", "Startups", "Vesting"],
    author: "Marcus Sterling",
    authorRole: "CTO @ Scale AI",
    content: `
### How to Value 0.1% of a Seed vs Series C Startup
Equity without liquidity is just paper. Understand the 4-year vesting schedule, 1-year cliff, exercise windows (90 days vs 10 years), and secondary market liquidity policies before accepting a lower cash salary.
    `
  },
  {
    id: "art-21",
    categoryId: "cat-salary",
    categoryName: "Salary & Compensation",
    title: "How to Ask for a Promotion and 25%+ Raise at Your Current Company",
    readTime: "7 min read",
    publishedDate: "March 2026",
    summary: "Don't wait for your annual appraisal. Build the promotion case 6 months in advance with quantifiable milestones.",
    tags: ["Promotion", "Appraisals", "Raise", "Career Growth"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### The 6-Month Promo Flywheel
1. Month 1: Review the next-level rubric with your manager and agree on 3 tangible stretch projects.
2. Month 3: Check-in on mid-point deliverables and secure peer endorsements.
3. Month 5: Submit the draft promotion packet highlighting business metrics.
4. Month 6: Formal promotion review with executive sponsorship.
    `
  },

  // 8. Career Stories & Case Studies
  {
    id: "art-22",
    categoryId: "cat-stories",
    categoryName: "Career Stories & Case Studies",
    title: "Case Study: How Marcus Transitioned from Mid-Level to Staff SWE in 18 Months",
    readTime: "6 min read",
    publishedDate: "June 2026",
    summary: "A breakdown of how structured career acceleration helped Marcus double his compensation and lead architecture for distributed checkout.",
    tags: ["Case Study", "Staff Engineer", "Success Story", "Mentorship"],
    author: "Elena Rostova",
    authorRole: "Staff Software Engineer @ Google",
    content: `
### The Challenge
Marcus had been an L4 Software Engineer for 3 years, building solid features but struggling to demonstrate the org-wide influence needed for Staff.

### The Mentorship Strategy
Through bi-weekly sessions on CareerBuddies, Marcus worked with Elena to:
1. Identify a critical, unowned reliability bottleneck in the checkout pipeline.
2. Author an RFC adopted across 4 engineering pods.
3. Quantify $2.4M in prevented outage revenue.

### The Outcome
Marcus skipped L5 and was promoted directly to Staff Engineer (L6) with a 65% compensation increase.
    `
  },
  {
    id: "art-23",
    categoryId: "cat-stories",
    categoryName: "Career Stories & Case Studies",
    title: "Case Study: Breaking into Tier-1 Product Management from Data Analytics",
    readTime: "7 min read",
    publishedDate: "May 2026",
    summary: "Priya Sharma shares how mock interview drills and PRD critique helped her secure offers from Brex and Square.",
    tags: ["Case Study", "Product Management", "Career Pivot", "Offer Letters"],
    author: "David K. Vance",
    authorRole: "VP of Product @ Stripe",
    content: `
### The Challenge
Priya had strong SQL and data modeling skills, but recruiters repeatedly rejected her for lack of dedicated PM title experience.

### The Solution
David helped Priya reposition her analytics projects as product discovery wins, showing how her insights directly steered a $5M feature launch.
    `
  },
  {
    id: "art-24",
    categoryId: "cat-stories",
    categoryName: "Career Stories & Case Studies",
    title: "Case Study: From Tier-3 College in India to Global Engineering Lead",
    readTime: "8 min read",
    publishedDate: "April 2026",
    summary: "How structured system design practice and open-source contributions opened doors to top multinational tech companies.",
    tags: ["Global Placement", "Inspiration", "India Tech", "Success Story"],
    author: "Dr. Sanjay Patel",
    authorRole: "Head of Machine Learning @ Meta",
    content: `
### Breaking the Pedigree Bias
You do not need a pedigree degree to work at the highest levels of global technology. By mastering fundamental data structures, distributed consensus algorithms, and contributing to high-visibility open-source projects, your technical evidence speaks for itself.
    `
  }
];
