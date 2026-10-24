import React, { useEffect, useMemo, useState } from 'react';
import { useMentors, usePlans, useServices, useWebinarOffer, webinarPriceSuffix, withEntryPrice } from '../../hooks/useCmsCatalog';
import { usePublicLoading } from '../../hooks/usePublicCollection';
import { CardGridSkeleton } from '../common/Skeleton';
import { numberWord } from '../../utils/countCopy';
import { DEFAULT_SITE_CONFIG, JOURNEY_TIMELINE } from '../../config/siteConfig';
import { DEFAULT_HOME_JOURNEY } from '../../config/homeJourney';
import { DEFAULT_HOME_FAQ } from '../../config/homeFaq';
import { DEFAULT_HOME_SERVICES } from '../../config/homeServices';
import { DEFAULT_HOME_MASTERCLASSES, DEFAULT_HOME_CHECK_IN } from '../../config/homeMasterclasses';
import { homeSectionHtml, isHomeSectionOn } from '../../config/homeSections';
import { HomeHtmlBlock } from '../common/HomeHtmlBlock';
import { Mentor, PageView, ServiceItem, PlanItem, WebinarItem } from '../../types';
import { BrandTagline } from '../BrandTagline';
import { FindYourNextStep } from '../common/FindYourNextStep';
import { WhyTrustSection } from '../common/WhyTrustSection';
import { LeadershipSection } from '../common/LeadershipSection';
import { SectionHeading } from '../common/SectionHeading';
import { SiteSettingsData, pickText } from '../../hooks/useSiteSettings';
import { PendingCheckout } from '../../utils/checkoutIntent';
import { 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle2, 
  Star, 
  ArrowRight, 
  Sparkles, 
  Briefcase,
  Users,
  Calendar,
  Compass,
  GraduationCap,
  Video,
  ChevronRight,
  PhoneCall,
  HeartHandshake,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Layers,
  Zap,
  Target
} from 'lucide-react';
import { submitLead } from '../../utils/submitLead';
import { buttonProps } from '../../utils/a11y';
import { CheckoutEnrollment, WebinarCheckoutModal } from '../modals/WebinarCheckoutModal';
import { PlanDeliverablesModal } from '../modals/PlanDeliverablesModal';
import { useOwnedPurchases } from '../../hooks/useOwnedPurchases';
import { Reveal, RevealItem, Stagger } from '../home/MotionReveal';

const DEFAULT_HERO_BADGE = 'Bridging the gap between aspiration and achievement';
const DEFAULT_HERO_TITLE = 'Accelerate Your Career with Structured Practitioner Guidance';
const DEFAULT_HERO_SUBHEADING =
  'Navigate career transitions, level up to Senior and Staff engineering, and master system design with verified leaders from top global technology ecosystems.';
const DEFAULT_HERO_CARDS = [
  { label: 'Staff & Principal Track', value: 'High-Impact Architecture & Leadership' },
  { label: '1:1 Practitioner Mentorship', value: 'FAANG+ & Tier-1 Tech Ecosystem Leaders' },
  { label: 'Diagnostic & Roadmap Formulation', value: 'Step-by-step career acceleration plan' },
];

function rupeesFrom(raw: string | number | undefined): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function planToEnrollment(plan: PlanItem): CheckoutEnrollment {
  return {
    itemType: 'plan',
    itemId: String(plan.id),
    title: plan.name,
    subtitle: plan.tagline || plan.description,
    priceINR: rupeesFrom(plan.priceINR),
    extraDetails: {
      priceINR: plan.priceINR,
      period: plan.period || '',
      deliverables: (plan.features || []).map((f) => f.title).filter(Boolean).join(', '),
    },
  };
}

interface HomeScreenProps {
  onSelectMentor: (mentor: Mentor) => void;
  onBookMentor: (mentor: Mentor) => void;
  onStartMatching: () => void;
  onBecomeMentor: () => void;
  onOpenCounselling: () => void;
  onSelectService: (service: ServiceItem) => void;
  onSelectPlan: (plan: PlanItem) => void;
  setActivePage: (page: PageView) => void;
  onOpenLiveWebinar?: (webinar?: WebinarItem | null) => void;
  onSelectLeader?: (slug: string) => void;
  siteSettings?: SiteSettingsData | null;
  // Returns true when signed in (caller opens checkout); otherwise shows the
  // auth popup and the checkout reopens automatically after login.
  onRequireAuth?: (intent: PendingCheckout) => boolean;
  // Checkout waiting for a just-completed sign-in (social redirect flow).
  restoredCheckout?: PendingCheckout | null;
  onRestoredCheckoutHandled?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectMentor,
  onBookMentor,
  onStartMatching,
  onBecomeMentor,
  onOpenCounselling,
  onSelectService,
  onSelectPlan,
  setActivePage,
  onOpenLiveWebinar,
  onSelectLeader,
  siteSettings,
  onRequireAuth,
  restoredCheckout,
  onRestoredCheckoutHandled
}) => {
  const savedTitle = siteSettings?.home?.heroTitle?.trim() || '';
  const savedSubtitle = siteSettings?.home?.heroSubtitle?.trim() || '';
  const savedDescription = siteSettings?.home?.heroDescription?.trim() || '';
  const heroTitle = savedTitle || DEFAULT_HERO_TITLE;
  const heroSubheading = savedDescription || savedSubtitle || DEFAULT_HERO_SUBHEADING;
  const heroBadge =
    savedSubtitle && savedSubtitle !== heroSubheading
      ? savedSubtitle
      : savedSubtitle && savedDescription
        ? savedSubtitle
        : DEFAULT_HERO_BADGE;
  const heroCards = [0, 1, 2].map((index) => {
    const row = siteSettings?.home?.stats?.[index];
    return {
      label: pickText(row?.label, DEFAULT_HERO_CARDS[index].label),
      value: pickText(row?.value, DEFAULT_HERO_CARDS[index].value),
      badge: pickText(row?.badge, index === 1 ? 'Active' : ''),
    };
  });
  const { hasLive, priceINR: entryPrice, webinar: liveWebinar } = useWebinarOffer();
  const journeyEyebrow = pickText(siteSettings?.home?.journeyEyebrow, DEFAULT_HOME_JOURNEY.eyebrow);
  const journeyTitle = pickText(siteSettings?.home?.journeyTitle, DEFAULT_HOME_JOURNEY.title);
  const journeyDescription = pickText(siteSettings?.home?.journeyDescription, DEFAULT_HOME_JOURNEY.description);
  const journeyCtaEyebrow = pickText(siteSettings?.home?.journeyCtaEyebrow, DEFAULT_HOME_JOURNEY.ctaEyebrow);
  const journeyCtaTitle = pickText(siteSettings?.home?.journeyCtaTitle, DEFAULT_HOME_JOURNEY.ctaTitle);
  const journeyCtaDescription = pickText(siteSettings?.home?.journeyCtaDescription, DEFAULT_HOME_JOURNEY.ctaDescription);
  const journeyMoreText = pickText(siteSettings?.home?.journeyMoreText, DEFAULT_HOME_JOURNEY.moreText);
  const faqEyebrow = pickText(siteSettings?.home?.faqEyebrow, DEFAULT_HOME_FAQ.eyebrow);
  const faqTitle = pickText(siteSettings?.home?.faqTitle, DEFAULT_HOME_FAQ.title);
  const faqDescription = pickText(siteSettings?.home?.faqDescription, DEFAULT_HOME_FAQ.description);
  const servicesEyebrow = pickText(siteSettings?.home?.servicesEyebrow, DEFAULT_HOME_SERVICES.eyebrow);
  const servicesTitle = pickText(siteSettings?.home?.servicesTitle, DEFAULT_HOME_SERVICES.title);
  const servicesDescription = pickText(siteSettings?.home?.servicesDescription, DEFAULT_HOME_SERVICES.description);
  const masterclassesEyebrow = pickText(siteSettings?.home?.masterclassesEyebrow, DEFAULT_HOME_MASTERCLASSES.eyebrow);
  const masterclassesTitle = pickText(siteSettings?.home?.masterclassesTitle, DEFAULT_HOME_MASTERCLASSES.title);
  const masterclassesDescription = pickText(
    siteSettings?.home?.masterclassesDescription,
    DEFAULT_HOME_MASTERCLASSES.description
  );
  const masterclassesButton = pickText(
    siteSettings?.home?.masterclassesButtonText,
    DEFAULT_HOME_MASTERCLASSES.buttonText
  );
  const checkInEyebrow = pickText(siteSettings?.home?.checkInEyebrow, DEFAULT_HOME_CHECK_IN.eyebrow);
  const checkInTitle = pickText(siteSettings?.home?.checkInTitle, DEFAULT_HOME_CHECK_IN.title);
  const checkInDescription = pickText(siteSettings?.home?.checkInDescription, DEFAULT_HOME_CHECK_IN.description);
  const checkInButton = pickText(siteSettings?.home?.checkInButtonText, DEFAULT_HOME_CHECK_IN.buttonText);
  const savedFaqs = siteSettings?.home?.faqItems || [];
  const faqItems = (savedFaqs.length > 0 ? savedFaqs : DEFAULT_HOME_FAQ.items)
    .map((row) => ({
      question: row.question?.trim() || '',
      answer: row.answer?.trim() || '',
    }))
    .filter((row) => row.question);
  const show = (id: Parameters<typeof isHomeSectionOn>[1]) => isHomeSectionOn(siteSettings?.home, id);
  const htmlOf = (id: Parameters<typeof homeSectionHtml>[1]) => homeSectionHtml(siteSettings?.home, id);
  const goToLiveWebinar = () => {
    if (onOpenLiveWebinar) onOpenLiveWebinar(liveWebinar);
    else setActivePage('webinars');
  };
  const STRUCTURED_SERVICES = useServices();
  const CAREER_PLANS = usePlans();
  const plansLoading = usePublicLoading('/api/plans');
  const servicesLoading = usePublicLoading('/api/services');
  const mentorsLoading = usePublicLoading('/api/mentors');
  const planCount = CAREER_PLANS.length;
  const savedStages = siteSettings?.home?.journeyStages || [];
  const journeyStageCount = Math.max(DEFAULT_HOME_JOURNEY.stages.length, savedStages.length);
  const journeyStages = Array.from({ length: journeyStageCount }, (_, index) => {
    const fallback = DEFAULT_HOME_JOURNEY.stages[index] || { title: '', badge: '', desc: '' };
    const row = savedStages[index];
    let badge = pickText(row?.badge, fallback.badge);
    if (index === 0 && !row?.badge?.trim()) {
      badge = hasLive && entryPrice ? `₹${entryPrice} Entry` : fallback.badge;
    }
    let title = pickText(row?.title, fallback.title);
    if (index === 3 && !row?.title?.trim()) {
      title = planCount <= 1 ? fallback.title : `Choose 1 of ${planCount} Plans`;
    }
    return {
      step: String(index + 1).padStart(2, '0'),
      title,
      badge,
      desc: pickText(row?.desc, fallback.desc),
      color: index % 2 === 0 ? 'green' : 'blue',
    };
  }).filter((stage) => stage.title);
  const allMentors = useMentors();
  const previewServices = STRUCTURED_SERVICES.slice(0, 6);
  const owned = useOwnedPurchases();
  const [payPlan, setPayPlan] = useState<PlanItem | null>(null);
  const [detailsPlan, setDetailsPlan] = useState<PlanItem | null>(null);
  const startPlanEnroll = (plan: PlanItem) => {
    setDetailsPlan(null);
    if (plan.isCustomPricing || !plan.onlinePayment || rupeesFrom(plan.priceINR) <= 0) {
      onSelectPlan(plan);
      return;
    }
    if (onRequireAuth && !onRequireAuth({ type: 'plan', item: plan })) return;
    setPayPlan(plan);
  };

  // Reopen a checkout that was waiting for a sign-in to finish (social redirect
  // flow hands the item back through App).
  useEffect(() => {
    if (restoredCheckout?.type === 'plan') {
      setPayPlan(restoredCheckout.item);
      onRestoredCheckoutHandled?.();
    }
  }, [restoredCheckout, onRestoredCheckoutHandled]);
  const previewMentors = useMemo(() => {
    const featured = allMentors.filter((m) => m.featured);
    const rest = allMentors.filter((m) => !m.featured);
    return [...featured, ...rest].slice(0, 6);
  }, [allMentors]);

  // Quick Hero Lead Capture Form state
  const [heroForm, setHeroForm] = useState({
    name: '',
    mobile: '',
    email: '',
    goal: 'Career Direction & Mentorship'
  });
  const [heroSubmitted, setHeroSubmitted] = useState(false);
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleHeroFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroForm.name || !heroForm.mobile) return;

    setHeroLoading(true);
    setHeroError(null);
    try {
      const parts = heroForm.name.trim().split(' ');
      const result = await submitLead({
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || '',
        mobile: heroForm.mobile.trim(),
        email: heroForm.email.trim(),
        requirement: heroForm.goal,
        planInterest: 'Free Diagnostic Counselling',
        source: 'Hero Quick Diagnostic'
      });
      if (!result.ok) {
        setHeroError(result.error || 'We could not send your details. Please try again.');
        return;
      }
      setHeroSubmitted(true);
    } finally {
      setHeroLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-white">
      
      {/* 1. HERO SECTION (Left Content + Right Career Progression Visual Architecture) */}
      {show('hero') && htmlOf('hero') && <HomeHtmlBlock html={htmlOf('hero')} />}
      {show('hero') && !htmlOf('hero') && (
      <section className="relative overflow-hidden bg-[#002869] text-white pt-8 sm:pt-12 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-10">
        {/* Atmospheric Career-Growth & Progression Background Visual */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-25">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1440 800" fill="none">
            <defs>
              <linearGradient id="heroGrowthGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#79fd8d" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#79fd8d" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#dae2ff" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="heroGridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dae2ff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#79fd8d" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Subtle Career Growth Vectors & Progression Grid */}
            <path d="M-100 720 C 300 660, 600 480, 950 340 C 1200 240, 1400 140, 1600 70" stroke="url(#heroGrowthGrad)" strokeWidth="2" strokeDasharray="8 6" />
            <path d="M-50 780 C 350 720, 750 520, 1100 380 C 1300 290, 1480 180, 1650 90" stroke="url(#heroGrowthGrad)" strokeWidth="1.5" strokeOpacity="0.4" />
            
            {/* Ambient Tech Grid Nodes */}
            <circle cx="950" cy="340" r="4.5" fill="#79fd8d" fillOpacity="0.8" />
            <circle cx="1100" cy="250" r="5.5" fill="#79fd8d" fillOpacity="0.9" />
            <circle cx="1250" cy="160" r="6.5" fill="#79fd8d" />
            <circle cx="1250" cy="160" r="15" stroke="#79fd8d" strokeWidth="1.5" strokeOpacity="0.35" />
          </svg>
        </div>

        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-[#79fd8d]/10 rounded-full blur-3xl pointer-events-none -mr-28 -mt-28" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-[#dae2ff]/10 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24" />

        <div className="relative z-10 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Clean, Left-Aligned Hero Content Hierarchy */}
          <Stagger className="lg:col-span-7 flex flex-col gap-5 sm:gap-6 text-left">
            
            {/* 1. Small Brand / Trust Badge */}
            <RevealItem className="w-fit">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 shadow-xs hover:bg-white/15 transition-all">
                <Sparkles className="w-3.5 h-3.5 text-[#79fd8d]" />
                <span className="text-xs font-bold text-[#dae2ff] tracking-wide">
                  {heroBadge}
                </span>
              </div>
            </RevealItem>

            {/* 2. Main Hero Headline */}
            <RevealItem>
            <h1 className="text-3xl sm:text-4xl md:text-4.5xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.16] font-['Plus_Jakarta_Sans',sans-serif]">
              {savedTitle ? (
                heroTitle
              ) : (
                <>
                  Accelerate Your Career with{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#dae2ff] to-[#79fd8d]">
                    Structured Practitioner Guidance
                  </span>
                </>
              )}
            </h1>
            </RevealItem>

            {/* 3. Supporting Description */}
            <RevealItem>
            <p className="text-sm sm:text-base text-[#dae2ff]/90 leading-relaxed max-w-xl font-normal">
              {heroSubheading}
            </p>
            </RevealItem>

            {/* 4 & 5. Primary and Secondary CTAs */}
            <RevealItem>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-3.5 pt-1">
              <button
                id="hero-advisor-cta-btn"
                onClick={onOpenCounselling}
                className="w-full sm:w-auto justify-center px-6 py-3.5 rounded-xl bg-[#006e29] hover:bg-[#00531d] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>{pickText(siteSettings?.home?.heroCtaText, 'Connect with Our Advisor')}</span>
                <ArrowRight className="w-4 h-4 text-[#79fd8d]" />
              </button>

              {hasLive && (
              <button
                id="hero-webinar-cta-btn"
                onClick={goToLiveWebinar}
                className="shine-btn w-full sm:w-auto justify-center px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 text-[#79fd8d]" />
                <span>Join Live Webinar{webinarPriceSuffix(entryPrice)}</span>
              </button>
              )}

              <button
                id="hero-explore-programmes-btn"
                onClick={() => setActivePage('programmes')}
                className="w-full sm:w-auto justify-center px-4 sm:px-0 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-[#dae2ff] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#79fd8d]" />
                <span>Explore Programmes</span>
              </button>
            </div>
            </RevealItem>

            {/* Qualitative Trust Badges */}
            <RevealItem>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-white/15 text-xs text-[#dae2ff]/90">
              {hasLive && (
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#79fd8d] shrink-0" />
                Live Practitioner Masterclasses
              </span>
              )}
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#79fd8d] shrink-0" />
                Dedicated Advisor Profile Alignment
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#79fd8d] shrink-0" />
                Personalized Industry Master Sessions
              </span>
            </div>
            </RevealItem>

          </Stagger>

          {/* Right Column: Seamless Integrated Career Progression & Mentorship Architecture Visual */}
          <Reveal delay={0.18} x={32} y={0} className="lg:col-span-5 relative w-full flex items-center justify-center py-2 lg:py-0">
            
            {/* Atmospheric Background Blending & Radial Highlights */}
            <div className="hero-career-visual relative w-full max-w-[480px] lg:max-w-none aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/4] flex items-center justify-center">
              
              {/* Soft Ambient Depth Blooms merging seamlessly into the Hero background */}
              <div className="absolute top-1/4 right-6 w-52 h-52 bg-[#79fd8d]/12 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-4 left-8 w-60 h-60 bg-[#004bb5]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-radial from-white/[0.03] to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Integrated Vector System: Ascending Career Growth & Technology Architecture */}
              <svg 
                className="w-full h-full absolute inset-0 overflow-visible pointer-events-none select-none" 
                viewBox="0 0 500 420" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Gradients for Ascending Trajectories */}
                  <linearGradient id="heroAscGrad1" x1="40" y1="380" x2="440" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#dae2ff" stopOpacity="0.1" />
                    <stop offset="35%" stopColor="#dae2ff" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#79fd8d" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#79fd8d" stopOpacity="1" />
                  </linearGradient>

                  <linearGradient id="heroAscGrad2" x1="60" y1="390" x2="460" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#dae2ff" stopOpacity="0.05" />
                    <stop offset="50%" stopColor="#006e29" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#79fd8d" stopOpacity="0.6" />
                  </linearGradient>

                  <filter id="heroApexGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="10" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Layer 1: Ambient Tech Constellation & Depth Grid */}
                <g opacity="0.2">
                  <line x1="60" y1="120" x2="440" y2="120" stroke="#dae2ff" strokeWidth="1" strokeDasharray="4 8" strokeOpacity="0.4" />
                  <line x1="60" y1="220" x2="440" y2="220" stroke="#dae2ff" strokeWidth="1" strokeDasharray="4 8" strokeOpacity="0.3" />
                  <line x1="60" y1="320" x2="440" y2="320" stroke="#dae2ff" strokeWidth="1" strokeDasharray="4 8" strokeOpacity="0.2" />
                  <circle cx="160" cy="120" r="2" fill="#dae2ff" fillOpacity="0.6" />
                  <circle cx="340" cy="220" r="2" fill="#dae2ff" fillOpacity="0.6" />
                  <circle cx="220" cy="320" r="2" fill="#dae2ff" fillOpacity="0.6" />
                </g>

                {/* Layer 2: Guided Trajectory Energy Conduits (Mentor to Mentee Growth Arc) */}
                <path 
                  d="M 50 370 C 130 360, 180 290, 240 240 C 310 180, 360 130, 430 75" 
                  stroke="url(#heroAscGrad2)" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  opacity="0.5"
                />
                <path 
                  d="M 60 360 C 140 345, 190 270, 255 220 C 325 165, 380 110, 440 60" 
                  stroke="url(#heroAscGrad1)" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />
                <path 
                  className="hero-path-flow"
                  d="M 75 350 C 150 330, 200 250, 270 200 C 340 145, 395 95, 450 50" 
                  stroke="#79fd8d" 
                  strokeWidth="1.5" 
                  strokeDasharray="5 7" 
                  strokeOpacity="0.7"
                />
                <circle className="hero-travel-dot" r="3.5" fill="#79fd8d">
                  <animateMotion dur="6.5s" repeatCount="indefinite" path="M 60 360 C 140 345, 190 270, 255 220 C 325 165, 380 110, 440 60" />
                </circle>
                <circle className="hero-travel-dot" r="2.5" fill="#dae2ff" fillOpacity="0.9">
                  <animateMotion dur="6.5s" begin="2.1s" repeatCount="indefinite" path="M 60 360 C 140 345, 190 270, 255 220 C 325 165, 380 110, 440 60" />
                </circle>
                <circle className="hero-travel-dot" r="2" fill="#79fd8d" fillOpacity="0.8">
                  <animateMotion dur="6.5s" begin="4.2s" repeatCount="indefinite" path="M 60 360 C 140 345, 190 270, 255 220 C 325 165, 380 110, 440 60" />
                </circle>

                {/* Layer 3: Career Stage Stepping Platforms (Integrated Depth Vectors) */}
                {/* Stage 1: Diagnostic */}
                <g transform="translate(60, 330)">
                  <ellipse cx="25" cy="18" rx="35" ry="12" fill="#001f52" fillOpacity="0.7" stroke="#dae2ff" strokeWidth="1" strokeOpacity="0.3" />
                  <circle className="hero-node-pulse" cx="25" cy="18" r="4.5" fill="#dae2ff" fillOpacity="0.8" />
                  <line x1="25" y1="18" x2="25" y2="-15" stroke="#dae2ff" strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.5" />
                </g>

                {/* Stage 2: Masterclass & Skill Expansion */}
                <g transform="translate(160, 240)">
                  <ellipse cx="30" cy="20" rx="42" ry="14" fill="#002869" fillOpacity="0.8" stroke="#79fd8d" strokeWidth="1" strokeOpacity="0.4" />
                  <circle className="hero-node-pulse" style={{ animationDelay: '0.8s' }} cx="30" cy="20" r="5" fill="#79fd8d" fillOpacity="0.9" />
                  <line x1="30" y1="20" x2="30" y2="-20" stroke="#79fd8d" strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.6" />
                </g>

                {/* Stage 3: 1:1 Senior Engineering & Systems Architecture */}
                <g transform="translate(285, 150)">
                  <ellipse cx="35" cy="22" rx="48" ry="16" fill="#003d8f" fillOpacity="0.7" stroke="#79fd8d" strokeWidth="1.2" strokeOpacity="0.6" />
                  <circle className="hero-node-pulse" style={{ animationDelay: '1.6s' }} cx="35" cy="22" r="6" fill="#79fd8d" />
                  <line x1="35" y1="22" x2="35" y2="-25" stroke="#79fd8d" strokeWidth="1.2" strokeDasharray="2 3" strokeOpacity="0.8" />
                </g>

                {/* Stage 4: Staff & Principal Leadership Apex */}
                <g transform="translate(405, 45)">
                  <circle className="hero-apex-breathe" cx="35" cy="20" r="28" fill="#79fd8d" fillOpacity="0.12" filter="url(#heroApexGlow)" />
                  <circle className="hero-apex-breathe" style={{ animationDelay: '1s' }} cx="35" cy="20" r="16" fill="#79fd8d" fillOpacity="0.25" />
                  <ellipse cx="35" cy="20" rx="44" ry="16" fill="#001f52" fillOpacity="0.85" stroke="#79fd8d" strokeWidth="1.5" />
                  <circle cx="35" cy="20" r="7" fill="#79fd8d" />
                  <circle cx="35" cy="20" r="11" stroke="#79fd8d" strokeWidth="1" strokeOpacity="0.5" />
                </g>

                {/* Upward Career Trajectory Vector Arrowhead */}
                <polygon points="450,45 462,55 448,60" fill="#79fd8d" opacity="0.9" />
              </svg>

              {/* Layer 4: Seamless Integrated Floating Milestone Elements */}
              <div className="relative z-10 w-full h-full flex flex-col justify-between p-2 sm:p-4">
                
                {/* Top Floating Node: Staff & Principal Apex Goal */}
                <div className="hero-card-float-top self-end mr-1 sm:mr-4">
                  <div className="hero-glass inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-[#79fd8d]/20 border border-[#79fd8d]/40 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-[#79fd8d]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-white tracking-wide">{heroCards[0].label}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#79fd8d] animate-pulse" />
                      </div>
                      <span className="text-[11px] text-[#79fd8d] font-semibold">{heroCards[0].value}</span>
                    </div>
                  </div>
                </div>

                {/* Mid-Tier Node: 1:1 Senior Mentor Alignment (Center) */}
                <div className="hero-card-float-mid self-center ml-2 sm:ml-6 my-auto">
                  <div className="hero-glass inline-flex items-center gap-3 px-3.5 py-2 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-[#006e29]/40 border border-[#79fd8d]/50 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-[#79fd8d]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white">{heroCards[1].label}</span>
                        {heroCards[1].badge && (
                          <span className="text-[10px] font-bold text-[#002869] bg-[#79fd8d] px-1.5 py-0.2 rounded-full">
                            {heroCards[1].badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#dae2ff]/90">{heroCards[1].value}</p>
                    </div>
                  </div>
                </div>

                {/* Lower Foundation Node: Profile Diagnostic & Structured Path */}
                <div className="hero-card-float self-start ml-1 sm:ml-3">
                  <div className="hero-glass inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl">
                    <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                      <Target className="w-3 h-3 text-[#dae2ff]" />
                    </div>
                    <div className="text-left">
                      <span className="text-[11px] font-bold text-white block">{heroCards[2].label}</span>
                      <span className="text-[10px] text-[#dae2ff]/70">{heroCards[2].value}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </Reveal>

        </div>
      </section>
      )}

      {/* 2. FIND YOUR NEXT STEP (Decision Grid) */}
      {show('nextStep') && htmlOf('nextStep') && <HomeHtmlBlock html={htmlOf('nextStep')} />}
      {show('nextStep') && !htmlOf('nextStep') && (
      <FindYourNextStep 
        onNavigate={setActivePage} 
        onOpenCounselling={onOpenCounselling}
        onOpenLiveWebinar={goToLiveWebinar}
        home={siteSettings?.home}
      />
      )}

      {/* 3. HOW CAREERBUDDIES WORKS (7-Step Real Customer Journey) */}
      {show('journey') && htmlOf('journey') && <HomeHtmlBlock html={htmlOf('journey')} />}
      {show('journey') && !htmlOf('journey') && (
      <section className="relative overflow-hidden w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-[#002869] text-white">
        {/* Subtle Ambient Brand Glows matching hero visual tone */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#79fd8d]/8 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#dae2ff]/8 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-[1280px] mx-auto flex flex-col gap-10 sm:gap-12">
          
          <Reveal>
          <SectionHeading
            eyebrow={journeyEyebrow}
            title={journeyTitle}
            description={journeyDescription}
            badgeIcon={Layers}
            badgeColor="blue"
            dark={true}
            align="center"
          />
          </Reveal>

          {/* 7-Step Progression Grid with Unified Architectural Hierarchy */}
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
            {journeyStages.map((item, idx) => (
              <RevealItem key={idx} hover className="h-full">
              <div 
                className="h-full bg-[#142d4f]/90 border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative hover:border-[#79fd8d]/60 hover:bg-[#18365e] transition-all duration-200 shadow-md hover:shadow-xl group"
              >
                <div>
                  {/* Step Header with Step Badge, Milestone Counter & Subtle Progression Cue */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-white/10 border border-white/15 text-[#dae2ff] group-hover:text-[#79fd8d] group-hover:border-[#79fd8d]/40 text-xs font-black flex items-center justify-center transition-colors">
                        {item.step}
                      </span>
                      <span className="text-[11px] font-bold text-white/70 group-hover:text-white/80 transition-colors uppercase tracking-wider">
                        Stage {item.step}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${
                      item.color === 'green' ? 'bg-[#79fd8d]/20 text-[#79fd8d] border border-[#79fd8d]/30' : 'bg-white/10 text-[#dae2ff] border border-white/15'
                    }`}>
                      {item.badge}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-white mb-2 font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-[#79fd8d] transition-colors">
                    {item.title}
                  </h2>

                  <p className="text-xs text-[#dae2ff]/80 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-3.5 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-[#79fd8d] group-hover:text-white transition-colors">
                  <span>Explore Stage {item.step}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>
              </RevealItem>
            ))}

            {hasLive && (
            <RevealItem hover className="h-full">
            <div className="h-full bg-gradient-to-br from-[#003d8f] to-[#002256] text-white rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-lg border border-white/20 hover:border-[#79fd8d]/40 transition-all">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold text-[#79fd8d] mb-3.5 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{journeyCtaEyebrow}</span>
                </div>
                <h2 className="text-lg font-bold text-white mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  {journeyCtaTitle}
                </h2>
                <p className="text-xs text-[#dae2ff] leading-relaxed">
                  {journeyCtaDescription}
                </p>
              </div>

              <button
                onClick={goToLiveWebinar}
                className="shine-btn mt-5 w-full py-2.5 rounded-xl bg-[#79fd8d] hover:bg-[#5cf272] text-[#002869] font-black text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Join Live Webinar{webinarPriceSuffix(entryPrice)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            </RevealItem>
            )}
          </Stagger>

          <Reveal>
          <div className="flex justify-center pt-2 sm:pt-4">
            <button
              onClick={() => setActivePage('how-it-works')}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>{journeyMoreText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          </Reveal>

        </div>
      </section>
      )}

      {/* 4. THREE STRUCTURED CAREER PLANS SHOWCASE */}
      {show('plans') && htmlOf('plans') && <HomeHtmlBlock html={htmlOf('plans')} />}
      {show('plans') && !htmlOf('plans') && (
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-[#f1f3ff] border-y border-[#cbdaff]">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10 sm:gap-12">
          
          <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl flex flex-col gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dae2ff] text-[#001947] text-xs font-bold w-fit">
                <Layers className="w-3.5 h-3.5 text-[#002869]" />
                <span>Step 4: {planCount === 0 ? 'Career Plans' : `${numberWord(planCount, true)} Tailored ${planCount === 1 ? 'Plan' : 'Plans'}`}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061b3b] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                Choose the Right CareerBuddies Plan for Your Stage
              </h2>
              <p className="text-sm text-[#434652] leading-relaxed">
                {hasLive && entryPrice
                  ? `After attending your ₹${entryPrice} webinar, your Career Advisor will match you with `
                  : 'Your Career Advisor will match you with '}
                {planCount <= 1 ? 'a structured plan' : `one of our ${numberWord(planCount)} structured plans`}. Dedicated profile work begins immediately upon enrolment.
              </p>
            </div>

            <button
              onClick={() => setActivePage('programmes')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#002869] text-white hover:bg-[#0b3d91] text-xs font-bold transition-all shadow-2xs cursor-pointer w-fit shrink-0"
            >
              <span>{planCount <= 1 ? 'View Plans' : `Compare All ${planCount} Plans`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          </Reveal>

          {plansLoading && CAREER_PLANS.length === 0 ? (
            <CardGridSkeleton count={3} />
          ) : CAREER_PLANS.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e0e8ff] p-10 text-center">
              <p className="text-sm font-bold text-[#061b3b]">Plans are being updated</p>
              <p className="text-xs text-[#434652] mt-1">Please check back soon.</p>
            </div>
          ) : (
          <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {CAREER_PLANS.map((plan) => (
              <RevealItem key={plan.id} hover className="h-full">
              <div
                className={`h-full bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between border transition-all duration-200 hover:shadow-lg relative ${
                  plan.isRecommended ? 'border-[#002869] ring-2 ring-[#002869]/20' : 'border-[#cbdaff]'
                }`}
              >
                {plan.isRecommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[#002869] text-white text-[11px] font-black tracking-wider uppercase shadow-xs">
                    Recommended Track
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-black uppercase text-[#006e29] tracking-wider">
                      {plan.tagline}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#dae2ff] text-[#001947] text-[11px] font-bold">
                      {plan.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif] mb-2">
                    {plan.name}
                  </h3>

                  <p className="text-xs text-[#434652] leading-relaxed mb-5">
                    {plan.description}
                  </p>

                  <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#e0e8ff] mb-5">
                    <div className="text-xs font-bold text-[#061b3b] mb-1">
                      {plan.sessionsCount}
                    </div>
                    <div className="text-[11px] text-[#666a76]">
                      {plan.supportType}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 mb-6">
                    <span className="text-[11px] font-bold uppercase text-[#666a76] tracking-wider">
                      Included Deliverables:
                    </span>
                    {plan.features.slice(0, 4).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-[#006e29] shrink-0 mt-0.5" />
                        <span className="text-[#434652]">{feat.title}</span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setDetailsPlan(plan)}
                        className="mt-1 text-left text-xs font-bold text-[#002869] hover:underline cursor-pointer"
                      >
                        Show more ({plan.features.length - 4} more)
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-[#002869] font-['Plus_Jakarta_Sans',sans-serif]">
                      {rupeesFrom(plan.priceINR) > 0 ? plan.priceINR : 'On request'}
                    </span>
                    <span className="text-[11px] text-[#666a76] block">
                      {plan.period}
                    </span>
                  </div>

                  {owned.has('plan', plan.id) ? (
                    <span className="px-4 py-2.5 rounded-xl bg-[#e8f8ee] text-[#00531d] text-xs font-black">
                      Already enrolled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startPlanEnroll(plan)}
                      className="px-4 py-2.5 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>
                        {plan.isCustomPricing || !plan.onlinePayment || rupeesFrom(plan.priceINR) <= 0
                          ? 'Contact advisor'
                          : 'Enroll Now'}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              </RevealItem>
            ))}
          </Stagger>
          )}

        </div>
      </section>
      )}

      {show('masterclasses') && htmlOf('masterclasses') && <HomeHtmlBlock html={htmlOf('masterclasses')} />}
      {show('masterclasses') && !htmlOf('masterclasses') && hasLive && (
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-[#f9f9ff]">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10 sm:gap-12">
          
          <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl flex flex-col gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#79fd8d]/25 text-[#00531d] text-xs font-bold w-fit">
                <GraduationCap className="w-3.5 h-3.5 text-[#006e29]" />
                <span>{masterclassesEyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061b3b] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                {masterclassesTitle}
              </h2>
              <p className="text-sm text-[#434652] leading-relaxed">
                {masterclassesDescription}
                {entryPrice && !masterclassesDescription.includes('₹')
                  ? ` Accessible at ₹${entryPrice} per session.`
                  : ''}
              </p>
            </div>

            <button
              onClick={() => setActivePage('webinars')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#002869] text-white hover:bg-[#0b3d91] text-xs font-bold transition-all shadow-2xs cursor-pointer w-fit shrink-0"
            >
              <span>{masterclassesButton}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          </Reveal>

        </div>
      </section>
      )}

      {/* 5. CAREER CHECK-IN TEASER (Section 9) */}
      {show('checkIn') && htmlOf('checkIn') && <HomeHtmlBlock html={htmlOf('checkIn')} />}
      {show('checkIn') && !htmlOf('checkIn') && (
      <section className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-10 bg-[#f1f3ff]">
        <Reveal className="max-w-[1280px] mx-auto bg-[#002869] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#79fd8d]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
            <div className="max-w-2xl flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-[#79fd8d] w-fit">
                <Compass className="w-3.5 h-3.5" />
                <span>{checkInEyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans',sans-serif]">
                {checkInTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[#dae2ff] leading-relaxed">
                {checkInDescription}
              </p>
            </div>

            <button
              onClick={() => setActivePage('career-check-in')}
              className="px-6 py-3.5 rounded-xl bg-[#79fd8d] hover:bg-[#5cf272] text-[#002869] font-extrabold text-xs sm:text-sm transition-all shadow-md whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0"
            >
              <span>{checkInButton}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Reveal>
      </section>
      )}

      {/* 6. STRUCTURED SERVICES PREVIEW */}
      {show('services') && htmlOf('services') && <HomeHtmlBlock html={htmlOf('services')} />}
      {show('services') && !htmlOf('services') && (
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10 sm:gap-12">
          
          <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl flex flex-col gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dae2ff] text-[#001947] text-xs font-bold w-fit">
                <Briefcase className="w-3.5 h-3.5 text-[#002869]" />
                <span>{servicesEyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061b3b] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                {servicesTitle}
              </h2>
              <p className="text-sm text-[#434652] leading-relaxed">
                {servicesDescription}
              </p>
            </div>

            <button
              onClick={() => setActivePage('services')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002869] hover:underline cursor-pointer shrink-0"
            >
              <span>View All Tracks</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          </Reveal>

          {servicesLoading && previewServices.length === 0 ? (
            <CardGridSkeleton count={3} />
          ) : previewServices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e0e8ff] p-10 text-center">
              <p className="text-sm font-bold text-[#061b3b]">Services are being updated</p>
              <p className="text-xs text-[#434652] mt-1">Please check back soon.</p>
            </div>
          ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {previewServices.map((service) => (
              <RevealItem key={service.id} hover className="h-full">
              <div
                {...buttonProps(() => onSelectService(service))}
                className="h-full bg-[#f9f9ff] rounded-2xl p-6 border border-[#e0e8ff] hover:border-[#002869]/50 transition-all duration-200 hover:shadow-2xs flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#dae2ff] text-[#001947] text-[11px] font-bold">
                      {service.category}
                    </span>
                    <span className="text-[11px] text-[#666a76] font-medium">
                      {service.duration}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#061b3b] group-hover:text-[#002869] transition-colors mb-2">
                    {service.title}
                  </h3>

                  <p className="text-xs text-[#434652] leading-relaxed mb-4 line-clamp-3">
                    {service.shortDescription}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#002869]">
                  <span>Explore Track</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              </RevealItem>
            ))}
          </Stagger>
          )}

        </div>
      </section>
      )}

      {/* 7. FEATURED VERIFIED MENTORS ("Learn Directly from Industry Leaders") */}
      {show('mentors') && htmlOf('mentors') && <HomeHtmlBlock html={htmlOf('mentors')} />}
      {show('mentors') && !htmlOf('mentors') && (
      <section className="relative w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10 sm:gap-12">
          
          <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl flex flex-col gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dae2ff] text-[#001947] border border-[#cbdaff] text-xs font-bold w-fit">
                <Users className="w-3.5 h-3.5 text-[#006e29]" />
                <span>Top Senior Mentors</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061b3b] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                Learn Directly from Industry Leaders
              </h2>
              <p className="text-sm text-[#434652] leading-relaxed">
                Learn directly from verified practitioners who have scaled systems, led high-output teams, and conducted hundreds of hiring rounds.
              </p>
            </div>

            <button
              onClick={() => setActivePage('mentors')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer w-fit shrink-0"
            >
              <span>Explore All Mentors</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          </Reveal>

          {mentorsLoading && previewMentors.length === 0 ? (
            <CardGridSkeleton count={3} />
          ) : previewMentors.length === 0 ? (
            <div className="bg-[#f9f9ff] border border-[#e0e8ff] rounded-2xl p-10 text-center">
              <Users className="w-10 h-10 text-[#666a76] mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold text-[#061b3b]">Mentor profiles are being updated</p>
              <p className="text-xs text-[#434652] mt-1">Please check back soon, or contact us and we will help you find the right guidance.</p>
            </div>
          ) : (
            <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewMentors.map((mentor) => (
                <RevealItem key={mentor.id} hover className="h-full">
                <div
                  className="h-full bg-white border border-[#e0e8ff] hover:border-[#002869]/50 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      {mentor.avatar ? (
                        <img
                          src={mentor.avatar}
                          alt={mentor.name}
                          className="w-16 h-16 rounded-xl object-cover border border-[#e0e8ff] shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-[#dae2ff] text-[#002869] flex items-center justify-center text-lg font-black shrink-0 border border-[#e0e8ff]">
                          {mentor.name.trim().charAt(0).toUpperCase() || 'M'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-[#061b3b] truncate">{mentor.name}</h3>
                          {mentor.verified && (
                            <span title="Verified Mentor">
                              <ShieldCheck className="w-4 h-4 text-[#006e29] shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#434652] truncate font-medium">{mentor.title}</p>
                        {mentor.company && (
                          <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-[#dae2ff] text-[#001947] text-[11px] font-bold">
                            {mentor.company}
                          </div>
                        )}
                      </div>
                    </div>

                    {mentor.bio && (
                      <p className="text-xs text-[#434652] leading-relaxed line-clamp-2 mb-4">{mentor.bio}</p>
                    )}

                    {mentor.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {mentor.topics.slice(0, 3).map((topic, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-[#f9f9ff] border border-[#e0e8ff] text-[#061b3b] px-2 py-0.5 rounded-md"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    {mentor.availableNext && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#006e29] bg-[#79fd8d]/20 px-2.5 py-1 rounded-md mb-4 font-semibold w-fit">
                        <Calendar className="w-3 h-3" />
                        <span>Next available: {mentor.availableNext}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#e0e8ff] flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#061b3b]">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{mentor.rating}</span>
                        <span className="text-[#666a76] font-normal">({mentor.reviewCount})</span>
                      </div>
                      {mentor.hourlyRate > 0 && (
                        <span className="text-xs text-[#006e29] font-bold">
                          ₹{mentor.hourlyRate.toLocaleString('en-IN')}<span className="text-[11px] text-[#666a76] font-normal">/session</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectMentor(mentor)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#002869] hover:bg-[#dae2ff]/50 rounded-lg transition-colors cursor-pointer"
                      >
                        Bio & Reviews
                      </button>
                      <button
                        type="button"
                        onClick={() => onBookMentor(mentor)}
                        className="px-4 py-1.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-semibold rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        Book Call
                      </button>
                    </div>
                  </div>
                </div>
                </RevealItem>
              ))}
            </Stagger>
          )}

        </div>
      </section>
      )}

      {/* 8. MEET OUR LEADERSHIP SECTION (The 3 Founders) */}
      {show('leadership') && htmlOf('leadership') && <HomeHtmlBlock html={htmlOf('leadership')} />}
      {show('leadership') && !htmlOf('leadership') && (
      <LeadershipSection
        onSelectLeader={onSelectLeader}
        setActivePage={setActivePage}
        onOpenCounselling={onOpenCounselling}
        onBackToHome={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
      )}

      {/* 9. AUTHENTIC JOURNEY TEASER (2022-2026) */}
      {show('story') && htmlOf('story') && <HomeHtmlBlock html={htmlOf('story')} />}
      {show('story') && !htmlOf('story') && (
      <section className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-10 bg-white">
        <Reveal className="max-w-[1280px] mx-auto bg-[#f9f9ff] rounded-3xl p-8 sm:p-12 border border-[#cbdaff] flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="max-w-2xl flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dae2ff] text-[#001947] text-xs font-bold w-fit">
              <HeartHandshake className="w-3.5 h-3.5 text-[#006e29]" />
              <span>Authentic Brand Story</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
              "Career decisions often become more difficult when people have to make them alone."
            </h3>
            <p className="text-xs sm:text-sm text-[#434652] leading-relaxed">
              Started in 2022, CareerBuddies has grown into a structured technology-enabled ecosystem connecting ambitious learners with verified mentors, masterclasses, and actionable playbooks.
            </p>
          </div>

          <button
            onClick={() => setActivePage('about-us')}
            className="px-6 py-3.5 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs sm:text-sm font-bold transition-all shadow-2xs whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Read Our Journey (2022–2026)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </Reveal>
      </section>
      )}

      {/* 10. WHY TRUST CAREERBUDDIES */}
      {show('trust') && htmlOf('trust') && <HomeHtmlBlock html={htmlOf('trust')} />}
      {show('trust') && !htmlOf('trust') && <WhyTrustSection />}

      {/* 11. FAQ SECTION */}
      {show('faq') && htmlOf('faq') && <HomeHtmlBlock html={htmlOf('faq')} />}
      {show('faq') && !htmlOf('faq') && (
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-[#f9f9ff]">
        <div className="max-w-[900px] mx-auto flex flex-col gap-10 sm:gap-12">
          
          <Reveal>
          <SectionHeading
            eyebrow={faqEyebrow}
            title={faqTitle}
            description={faqDescription}
            badgeIcon={HelpCircle}
            badgeColor="blue"
            align="center"
          />
          </Reveal>

          <Stagger className="flex flex-col gap-3.5 sm:gap-4">
            {faqItems.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <RevealItem key={idx}>
                <div
                  className="bg-white border border-[#cbdaff] rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs hover:border-[#002869]/40"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 sm:py-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50"
                  >
                    <span className="text-sm sm:text-base font-bold text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                      {withEntryPrice(faq.question, entryPrice)}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#002869] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-2 text-xs sm:text-sm text-[#434652] leading-relaxed border-t border-gray-100">
                      {withEntryPrice(faq.answer, entryPrice)}
                    </div>
                  )}
                </div>
                </RevealItem>
              );
            })}
          </Stagger>

        </div>
      </section>
      )}

      {/* 12. FINAL CALL TO ACTION */}
      {show('cta') && htmlOf('cta') && <HomeHtmlBlock html={htmlOf('cta')} />}
      {show('cta') && !htmlOf('cta') && (
      <section className="w-full py-16 sm:py-22 px-4 sm:px-6 lg:px-10 bg-white text-[#061b3b]">
        <Reveal className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6 sm:gap-7">
          <div className="w-14 h-14 rounded-2xl bg-[#002869]/10 text-[#006e29] flex items-center justify-center shadow-2xs">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
            Start Your Structured Career Journey Today
          </h2>

          <p className="text-sm sm:text-base text-[#434652] max-w-xl leading-relaxed">
            {hasLive && entryPrice
              ? `Begin with an accessible ₹${entryPrice} live mentor-led masterclass, connect with a dedicated Career Advisor, and accelerate with our proven career plans.`
              : 'Connect with a dedicated Career Advisor and accelerate with our proven career plans.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 pt-2">
            {hasLive && (
            <button
              onClick={goToLiveWebinar}
              className="shine-btn px-8 py-3.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-[#002869]/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Join Live Mentor Webinar{webinarPriceSuffix(entryPrice)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            )}

            <button
              onClick={() => setActivePage('programmes')}
              className="px-6 py-3.5 bg-[#f0f5ff] hover:bg-[#e1edff] border border-[#cbdaff] text-[#002869] text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
            >
              Explore 3 Career Plans
            </button>
          </div>
        </Reveal>
      </section>
      )}

      <PlanDeliverablesModal
        plan={detailsPlan}
        alreadyEnrolled={detailsPlan ? owned.has('plan', detailsPlan.id) : false}
        onClose={() => setDetailsPlan(null)}
        onEnroll={startPlanEnroll}
      />
      <WebinarCheckoutModal
        isOpen={!!payPlan}
        onClose={() => setPayPlan(null)}
        enrollment={payPlan ? planToEnrollment(payPlan) : null}
      />
    </div>
  );
};
