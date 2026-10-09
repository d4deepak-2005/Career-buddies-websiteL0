import '../loadEnv.ts';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.ts';
import { Person } from '../models/Person.ts';

const SEED = [
  {
    name: 'Nishant Sharma',
    slug: 'nishant-sharma',
    role: 'founder',
    title: 'Founder, CareerBuddies',
    photoUrl: '/assets/team/nishant-sharma.jpg',
    yearsOfExperience: '10+ Years of Professional Experience',
    shortBio:
      'Passionate about democratizing access to high-caliber executive and technical mentorship. Driving the vision of structured career transformation for professionals worldwide.',
    longBio:
      'Nishant leads the overarching strategic direction, organizational vision, and mentorship quality benchmarks at CareerBuddies. He designs the core diagnostic assessment rubrics, oversees mentor vetting standards, and drives strategic initiatives to ensure every mentee receives structured, personalized career support.',
    email: 'nishant.sharma@careerbuddies.in',
    linkedIn: 'https://www.linkedin.com/company/careerbuddies',
    expertise: [
      'Career Development',
      'Professional Guidance',
      'Mentorship Architecture',
      'Business Strategy',
      'Community Building',
      'Product Vision',
    ],
    careerHighlights: [
      '12+ years leading technology initiatives and engineering organizations.',
      'Directly mentored 400+ professionals across Tier-1 tech ecosystems.',
      'Architected proprietary 5-pillar career diagnostic assessment used across CareerBuddies.',
      'Keynote speaker and mentor across national technology and leadership summits.',
    ],
    displayOrder: 0,
    visible: true,
  },
  {
    name: 'Deepak',
    slug: 'deepak',
    role: 'co-founder',
    title: 'Co-Founder, CareerBuddies',
    photoUrl: '/assets/team/deepak-sah.jpg',
    yearsOfExperience: '8+ Years of Professional Experience',
    shortBio:
      'Product strategist and technologist focused on crafting human-centric mentorship matching engines, career diagnostic rubrics, and personalized growth roadmaps.',
    longBio:
      'Deepak leads product experience, platform engineering, and digital workflows at CareerBuddies. He translates complex mentorship methodologies into seamless digital interactions—from smart mentor discovery and interactive webinars to automated milestone tracking.',
    email: 'deepak.sah@careerbuddies.in',
    linkedIn: 'https://www.linkedin.com/company/careerbuddies',
    expertise: [
      'Career Counselling Systems',
      'Professional Development',
      'Technology & Digital Platforms',
      'User Experience (UX)',
      'Growth Strategy',
      'Product Strategy',
    ],
    careerHighlights: [
      '10+ years driving product innovation, consumer platforms, and scaled systems.',
      'Guided 250+ aspiring and mid-career professionals into high-impact Product Management roles.',
      'Designed the 4-phase Career Journey Navigator and personalized mentorship matching rubric.',
    ],
    displayOrder: 1,
    visible: true,
  },
  {
    name: 'Divyanshu',
    slug: 'divyanshu',
    role: 'co-founder',
    title: 'Co-Founder, CareerBuddies',
    photoUrl: '/assets/team/divyanshu-gautam.jpg',
    yearsOfExperience: '8+ Years of Professional Experience',
    shortBio:
      'Building enterprise partner ecosystems, mentor vetting standards, and community initiatives connecting ambitious learners with industry-leading practitioners.',
    longBio:
      'Divyanshu orchestrates mentor relations, community operations, and live learning programs at CareerBuddies. He oversees the vetting and onboarding of senior practitioners and curates industry-relevant workshop curriculums.',
    email: 'divyanshu.gautam@careerbuddies.in',
    linkedIn: 'https://www.linkedin.com/company/careerbuddies',
    expertise: [
      'Mentor Partnerships',
      'Community Growth',
      'Operational Scale',
      'Talent Ecosystems',
      'Business Development',
      'Platform Growth',
    ],
    careerHighlights: [
      '9+ years scaling operational platforms, talent networks, and community education.',
      'Built a verified network of 150+ senior mentors from premier global tech companies.',
      'Curated and launched 50+ live interactive masterclasses.',
    ],
    displayOrder: 2,
    visible: true,
  },
];

async function main() {
  await connectDatabase();
  const existing = await Person.countDocuments();
  if (existing > 0) {
    console.log(`People collection already has ${existing} record(s); skip seed.`);
    await mongoose.disconnect();
    return;
  }
  await Person.insertMany(SEED);
  console.log(`Seeded ${SEED.length} leadership people.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
