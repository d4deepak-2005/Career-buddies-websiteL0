import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSiteSettings } from './hooks/useSiteSettings';
import { 
  PageView, 
  Mentor, 
  BookedSession, 
  ServiceItem, 
  PlanItem, 
  ResourceArticle, 
  WebinarItem, 
  WebinarRegistration 
} from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AICareerAssistant } from './components/AICareerAssistant';
const AdminAuthGate = lazyNamed(() => import('./components/common/AdminAuthGate'), 'AdminAuthGate');
import { PaymentStatusBanner } from './components/common/PaymentStatusBanner';

// Screens
import { HomeScreen } from './components/screens/HomeScreen';
const ServicesScreen = lazyNamed(() => import('./components/screens/ServicesScreen'), 'ServicesScreen');
const ProgrammesScreen = lazyNamed(() => import('./components/screens/ProgrammesScreen'), 'ProgrammesScreen');
const LeadershipScreen = lazyNamed(() => import('./components/screens/LeadershipScreen'), 'LeadershipScreen');
const SuccessStoriesScreen = lazyNamed(() => import('./components/screens/SuccessStoriesScreen'), 'SuccessStoriesScreen');
const HowItWorksScreen = lazyNamed(() => import('./components/screens/HowItWorksScreen'), 'HowItWorksScreen');
const PlansScreen = lazyNamed(() => import('./components/screens/PlansScreen'), 'PlansScreen');
const ResourcesScreen = lazyNamed(() => import('./components/screens/ResourcesScreen'), 'ResourcesScreen');
const MentorsScreen = lazyNamed(() => import('./components/screens/MentorsScreen'), 'MentorsScreen');
const AboutUsScreen = lazyNamed(() => import('./components/screens/AboutUsScreen'), 'AboutUsScreen');
const ContactScreen = lazyNamed(() => import('./components/screens/ContactScreen'), 'ContactScreen');
const LegalScreen = lazyNamed(() => import('./components/screens/LegalScreen'), 'LegalScreen');
import { applyPageMeta } from './utils/pageMeta';
import { LazyBoundary, ModalFallback, ScreenFallback, WhenOpen, lazyNamed } from './utils/lazy';
const CounsellingScreen = lazyNamed(() => import('./components/screens/CounsellingScreen'), 'CounsellingScreen');
const LeadsDashboardScreen = lazyNamed(() => import('./components/screens/LeadsDashboardScreen'), 'LeadsDashboardScreen');
const CareerCheckInScreen = lazyNamed(() => import('./components/screens/CareerCheckInScreen'), 'CareerCheckInScreen');
const WebinarsScreen = lazyNamed(() => import('./components/screens/WebinarsScreen'), 'WebinarsScreen');
const AdminScreen = lazyNamed(() => import('./components/screens/AdminScreen'), 'AdminScreen');
const LeaderProfileScreen = lazyNamed(() => import('./components/screens/LeaderProfileScreen'), 'LeaderProfileScreen');
const CandidateDashboardScreen = lazyNamed(() => import('./components/dashboard/CandidateDashboardScreen'), 'CandidateDashboardScreen');

// Modals
const SmartMatchingModal = lazyNamed(() => import('./components/modals/SmartMatchingModal'), 'SmartMatchingModal');
const BookingModal = lazyNamed(() => import('./components/modals/BookingModal'), 'BookingModal');
const MentorProfileModal = lazyNamed(() => import('./components/modals/MentorProfileModal'), 'MentorProfileModal');
const BecomeMentorModal = lazyNamed(() => import('./components/modals/BecomeMentorModal'), 'BecomeMentorModal');
const AuthModal = lazyNamed(() => import('./components/modals/AuthModal'), 'AuthModal');
const ResetPasswordModal = lazyNamed(() => import('./components/modals/ResetPasswordModal'), 'ResetPasswordModal');
const LinkAccountModal = lazyNamed(() => import('./components/modals/LinkAccountModal'), 'LinkAccountModal');
import {
  CandidateProfile,
  candidateFetch,
  clearCandidateToken,
  getCandidateToken,
  setCandidateToken
} from './utils/candidateAuth';
const CounsellingModal = lazyNamed(() => import('./components/modals/CounsellingModal'), 'CounsellingModal');
const ServiceDetailModal = lazyNamed(() => import('./components/modals/ServiceDetailModal'), 'ServiceDetailModal');
const ArticleReaderModal = lazyNamed(() => import('./components/modals/ArticleReaderModal'), 'ArticleReaderModal');
const WebinarDetailModal = lazyNamed(() => import('./components/modals/WebinarDetailModal'), 'WebinarDetailModal');
const WebinarCheckoutModal = lazyNamed(() => import('./components/modals/WebinarCheckoutModal'), 'WebinarCheckoutModal');

export default function App() {
  // Site Settings (MongoDB-backed CMS) — fetched once, null while loading or
  // unavailable, in which case every consumer below falls back to its
  // existing hardcoded content.
  const { settings: siteSettings } = useSiteSettings();

  // Client-side document title / meta description from Site Settings (SEO tab).
  // This is a Vite SPA with a static index.html, so this updates what the
  // browser tab shows but not what search-engine crawlers see pre-render.
  useEffect(() => {
    if (siteSettings?.seo?.metaTitle?.trim()) {
      document.title = siteSettings.seo.metaTitle;
    }
    if (siteSettings?.seo?.metaDescription?.trim()) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', siteSettings.seo.metaDescription);
      }
    }
  }, [siteSettings]);

  // Navigation Page State
  // A few pages can be opened directly / survive a refresh through the URL hash
  // (legal pages, and the admin workspace, which stays behind its own login).
  const HASH_PAGES: Record<string, PageView> = { '#privacy': 'privacy', '#terms': 'terms', '#refund': 'refund', '#admin': 'admin' };
  const pageUrl = (page: PageView) => {
    const hash = Object.keys(HASH_PAGES).find((h) => HASH_PAGES[h] === page) || '';
    return window.location.pathname + window.location.search + hash;
  };
  const [activePage, setActivePage] = useState<PageView>(() => HASH_PAGES[window.location.hash] || 'home');

  // Modals State
  const [isSmartMatchingOpen, setIsSmartMatchingOpen] = useState(false);
  const [isBecomeMentorOpen, setIsBecomeMentorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isCounsellingOpen, setIsCounsellingOpen] = useState(false);
  const [counsellingPlanInterest, setCounsellingPlanInterest] = useState<string>('Free 1:1 Strategic Diagnostic');

  // Webinar Modal State
  const [selectedWebinarForDetail, setSelectedWebinarForDetail] = useState<WebinarItem | null>(null);
  const [webinarToCheckout, setWebinarToCheckout] = useState<WebinarItem | null>(null);

  // Selected Entities for Modals
  const [bioMentor, setBioMentor] = useState<Mentor | null>(null);
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ResourceArticle | null>(null);

  // Booked Sessions State
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([]);

  // Webinar Registrations state
  const [webinarRegistrations, setWebinarRegistrations] = useState<WebinarRegistration[]>([]);

  // Lead counter for navbar feedback
  const [leadCounter, setLeadCounter] = useState(0);

  // Selected Leader Profile for individual view
  const [selectedLeaderSlug, setSelectedLeaderSlug] = useState<string>('nishant-sharma');
  const [previousNavPage, setPreviousNavPage] = useState<PageView>('about-us');

  // ---- Centralised page navigation: scroll position + browser history ----
  // Pages are swapped in place (no router), so the document keeps its old scroll
  // offset across page changes. One place handles it for every navigation path:
  //  - a new page always opens at the top (instant, cancelling any smooth scroll
  //    a click handler started);
  //  - each page change is a history entry, so Back/Forward move between pages and
  //    restore the scroll position each page was left at;
  //  - same-page anchors (scrollIntoView) are untouched — see scroll-padding-top
  //    in index.css, which keeps them clear of the sticky header.
  const scrollAtClick = useRef(0);
  const scrollByEntry = useRef(new Map<string, number>());
  const currentEntryId = useRef('');
  const restoreScrollTo = useRef<number | null>(null);
  const navKey = `${activePage}|${activePage === 'leader-profile' ? selectedLeaderSlug : ''}`;
  const prevNavKey = useRef<string | null>(null);
  const newEntryId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const instantScroll = (top: number) =>
    window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

    // Runs before any click handler, so it sees the scroll position of the page
    // being left (not one already changed by a handler's own scrollTo).
    const onClickCapture = () => {
      scrollAtClick.current = window.scrollY;
    };
    document.addEventListener('click', onClickCapture, true);

    const onPopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state || !state.cbPage || !state.cbId) return;
      // Scroll is in manual mode, so it still reflects the page we are leaving.
      scrollByEntry.current.set(currentEntryId.current, window.scrollY);
      currentEntryId.current = state.cbId;
      restoreScrollTo.current = scrollByEntry.current.get(state.cbId) ?? 0;
      if (state.cbLeader) setSelectedLeaderSlug(state.cbLeader);
      setActivePage(state.cbPage);
      // Same page/leader as now (only the scroll differs): restore directly.
      requestAnimationFrame(() => {
        const key = `${state.cbPage}|${state.cbPage === 'leader-profile' ? state.cbLeader || '' : ''}`;
        if (restoreScrollTo.current !== null && prevNavKey.current === key) {
          instantScroll(restoreScrollTo.current);
          restoreScrollTo.current = null;
        }
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Browser Back/Forward changes the page but dialogs are not history entries: close the read-only
  // detail dialogs so one can never stay open on top of a different page.
  useEffect(() => {
    setSelectedArticle(null);
    setSelectedService(null);
    setSelectedWebinarForDetail(null);
    setBioMentor(null);
  }, [activePage]);

  // Page-specific title / description / robots for the current page.
  useEffect(() => {
    applyPageMeta(activePage);
  }, [activePage]);

  // Keyboard users: "Skip to main content" moves focus to the page content.
  const skipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
      main.scrollIntoView();
    }
  };

  // Typing/pasting a #privacy, #terms, #refund or #admin address into an already-open tab.
  useEffect(() => {
    const onHashChange = () => {
      const page = HASH_PAGES[window.location.hash];
      if (page) setActivePage(page);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useLayoutEffect(() => {
    if (prevNavKey.current === null) {
      // First render: describe the current history entry.
      currentEntryId.current = newEntryId();
      window.history.replaceState(
        { ...(window.history.state || {}), cbPage: activePage, cbLeader: selectedLeaderSlug, cbId: currentEntryId.current },
        '',
        pageUrl(activePage)
      );
    } else if (prevNavKey.current !== navKey) {
      if (restoreScrollTo.current !== null) {
        // Arrived via Back/Forward: put the page back where the user left it.
        instantScroll(restoreScrollTo.current);
        restoreScrollTo.current = null;
      } else {
        // Fresh navigation: remember where we were, add an entry, open at the top.
        scrollByEntry.current.set(currentEntryId.current, scrollAtClick.current);
        currentEntryId.current = newEntryId();
        window.history.pushState(
          { cbPage: activePage, cbLeader: selectedLeaderSlug, cbId: currentEntryId.current },
          '',
          pageUrl(activePage)
        );
        instantScroll(0);
      }
    }
    prevNavKey.current = navKey;
  }, [navKey]);

  // Logged-in candidate (null = logged out). Restored from the stored session
  // token on load; the server decides who the token belongs to.
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(() => !getCandidateToken());

  useEffect(() => {
    if (!getCandidateToken()) {
      setAuthChecked(true);
      return;
    }
    candidateFetch('/api/candidate/me')
      .then(async (res) => {
        if (res.ok) {
          setCandidate((await res.json()).candidate);
        } else if (res.status === 401) {
          clearCandidateToken();
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  // ---- Social sign-in return trip (server redirects back with #social=<one-time code>
  // on success, or ?auth_error=<code> on cancel/failure) ----
  const [socialAuthMessage, setSocialAuthMessage] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);

  useEffect(() => {
    const cleanUrl = () =>
      window.history.replaceState(window.history.state, '', window.location.pathname);

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = hash.get('social');
    const linkParam = hash.get('link');
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('auth_error');
    const provider = params.get('auth_provider') || 'the provider';

    if (linkParam) {
      // An unverified provider email matched an existing account: ask the user to prove ownership.
      cleanUrl();
      setLinkCode(linkParam);
    } else if (code) {
      cleanUrl();
      setAuthChecked(false);
      fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.success) throw new Error(body.error || 'Sign-in failed. Please try again.');
          setCandidateToken(body.token, body.expiresAt);
          setCandidate(body.candidate);
          setActivePage('dashboard');
          window.scrollTo({ top: 0 });
          if (body.notice === 'linked_password_cleared') {
            window.alert('Your social account is now linked to your existing CareerBuddies account. For security, your previous password was cleared - please keep signing in with this provider.');
          }
        })
        .catch((err) => {
          setSocialAuthMessage(err.message || 'Sign-in failed. Please try again.');
          setAuthMode('login');
          setIsAuthOpen(true);
        })
        .finally(() => setAuthChecked(true));
    } else if (errorCode) {
      cleanUrl();
      const label = ({ google: 'Google', linkedin: 'LinkedIn', microsoft: 'Microsoft', facebook: 'Facebook' } as Record<string, string>)[provider] || 'Social';
      const unavailable = `${label} login is temporarily unavailable. Please use email/password.`;
      const messages: Record<string, string> = {
        cancelled: `${label} sign-in was cancelled. You can try again or use email/password.`,
        not_configured: unavailable,
        provider_error: `${label} could not complete the sign-in. Please try again or use email/password.`,
        // Something failed after the provider redirected back (code exchange / identity check).
        token_exchange_failed: `We couldn't verify your ${label} sign-in. Please try again or use email/password.`,
        invalid_id_token: `We couldn't verify your ${label} sign-in. Please try again or use email/password.`,
        profile_failed: `We couldn't read your ${label} profile. Please try again or use email/password.`,
        jwks_unavailable: `${label} sign-in is having a temporary problem. Please try again in a moment.`,
        server_error: `${label} sign-in could not be completed. Please try again or use email/password.`,
        invalid_state: `${label} sign-in could not be completed (the request expired or was started in a different browser). Please try again.`,
        email_unverified_conflict: `An account with this email already exists, and ${label} could not confirm that you own it. Please log in with your email and password.`,
        link_mismatch: `That ${label} sign-in belongs to a different CareerBuddies account, so nothing was linked. Please try again with the right account.`,
        link_expired: `That link request expired. Please start again from the login screen.`,
        identity_conflict: `This ${label} account is already connected to another CareerBuddies account.`,
        no_email: `${label} did not share an email address, which CareerBuddies needs to create your account. Please allow email access or sign up with email.`
      };
      setSocialAuthMessage(messages[errorCode] || unavailable);
      setAuthMode('login');
      setIsAuthOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Password reset link (/reset-password?token=...) ----
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [startInForgot, setStartInForgot] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/reset-password') {
      const token = new URLSearchParams(window.location.search).get('token');
      // Take the token out of the address bar straight away.
      window.history.replaceState(window.history.state, '', '/');
      if (token) setResetToken(token);
    }
  }, []);

  const handleAuthenticate = async (
    mode: 'login' | 'signup',
    data: { name: string; email: string; password: string; accountType: 'mentee' | 'mentor' }
  ): Promise<string | null> => {
    try {
      const res = await fetch(`/api/candidate/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        return body.error || 'Something went wrong. Please try again.';
      }
      setCandidateToken(body.token, body.expiresAt);
      setCandidate(body.candidate);
      setActivePage('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    } catch {
      return 'Could not reach the server. Please check your connection and try again.';
    }
  };

  const handleLogout = async () => {
    try {
      await candidateFetch('/api/candidate/logout', { method: 'POST' });
    } catch {
      // token is cleared locally regardless
    }
    clearCandidateToken();
    setCandidate(null);
    setActivePage('home');
    window.scrollTo({ top: 0 });
  };

  // Handlers
  const handleSelectLeader = (slug: string) => {
    setPreviousNavPage(activePage);
    setSelectedLeaderSlug(slug);
    setActivePage('leader-profile');
  };

  const handleSelectMentorForBio = (mentor: Mentor) => {
    setBioMentor(mentor);
  };

  const handleBookMentor = (mentor: Mentor) => {
    setBookingMentor(mentor);
  };

  const handleConfirmBooking = (session: BookedSession) => {
    setBookedSessions(prev => [session, ...prev]);
  };

  const handleOpenLogin = () => {
    setStartInForgot(false);
    setAuthMode('login');
    setIsAuthOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthMode('signup');
    setIsAuthOpen(true);
  };

  const handleOpenCounsellingWithPlan = (planName?: string) => {
    if (planName) {
      setCounsellingPlanInterest(planName);
    } else {
      setCounsellingPlanInterest('Free 1:1 Strategic Diagnostic');
    }
    setIsCounsellingOpen(true);
  };

  const handleSelectPlan = (plan: PlanItem) => {
    if (plan.isCustomPricing) {
      handleOpenCounsellingWithPlan(`${plan.name} (Custom Profile Pricing)`);
    } else {
      handleOpenCounsellingWithPlan(`${plan.name} Plan (${plan.priceINR})`);
    }
  };

  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
  };

  const handleSelectArticle = (article: ResourceArticle) => {
    setSelectedArticle(article);
  };

  const handleRegisterWebinar = (webinar: WebinarItem) => {
    setSelectedWebinarForDetail(null);
    setWebinarToCheckout(webinar);
  };

  const handleWebinarSuccess = (reg: WebinarRegistration) => {
    setWebinarRegistrations(prev => [reg, ...prev]);
    setLeadCounter(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#061b3b] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      <a href="#main-content" className="skip-link" onClick={skipToMain}>
        Skip to main content
      </a>

      {/* Top Header */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        siteSettings={siteSettings}
        onOpenLogin={handleOpenLogin}
        onOpenSignup={handleOpenSignup}
        onOpenUserDashboard={() => {
          if (!candidate) {
            handleOpenLogin();
            return;
          }
          setActivePage('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        candidateName={candidate?.firstName}
        onLogout={handleLogout}
        onOpenCounselling={(planTitle) => handleOpenCounsellingWithPlan(planTitle)}
        bookedCount={bookedSessions.length}
      />

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full focus:outline-none">
        <LazyBoundary key={activePage}>
        <Suspense fallback={<ScreenFallback />}>
        
        {/* 1. HOME SCREEN */}
        {activePage === 'home' && (
          <HomeScreen
            onSelectMentor={handleSelectMentorForBio}
            onBookMentor={handleBookMentor}
            onStartMatching={() => setIsSmartMatchingOpen(true)}
            onBecomeMentor={() => setIsBecomeMentorOpen(true)}
            onOpenCounselling={() => handleOpenCounsellingWithPlan()}
            onSelectService={handleSelectService}
            onSelectPlan={handleSelectPlan}
            setActivePage={setActivePage}
            onSelectLeader={handleSelectLeader}
            siteSettings={siteSettings}
          />
        )}

        {/* 2. PROGRAMMES SCREEN */}
        {activePage === 'programmes' && (
          <ProgrammesScreen
            onNavigate={setActivePage}
            onOpenCounselling={() => handleOpenCounsellingWithPlan('Specialised Programme Cohort')}
          />
        )}

        {/* 3. LEADERSHIP SCREEN */}
        {activePage === 'leadership' && (
          <LeadershipScreen
            onNavigate={setActivePage}
            onOpenCounselling={() => handleOpenCounsellingWithPlan('1:1 Guidance with Leadership Team')}
            onSelectLeader={handleSelectLeader}
          />
        )}

        {/* 4. SUCCESS STORIES SCREEN */}
        {activePage === 'success-stories' && (
          <SuccessStoriesScreen
            onNavigate={setActivePage}
            onOpenCounselling={() => handleOpenCounsellingWithPlan('Success Story Diagnostic Review')}
          />
        )}

        {/* 5. WEBINARS SCREEN */}
        {activePage === 'webinars' && (
          <WebinarsScreen
            onSelectWebinar={(webinar) => setSelectedWebinarForDetail(webinar)}
            onRegisterWebinar={(webinar) => handleRegisterWebinar(webinar)}
            onOpenCounselling={() => handleOpenCounsellingWithPlan('Webinar Follow-up 1:1 Counselling')}
            setActivePage={setActivePage}
          />
        )}

        {/* 6. CAREER CHECK-IN SCREEN */}
        {activePage === 'career-check-in' && (
          <CareerCheckInScreen
            onNavigate={setActivePage}
            onOpenCounselling={(planName) => handleOpenCounsellingWithPlan(planName)}
          />
        )}

        {/* 7. SERVICES CATALOG SCREEN */}
        {activePage === 'services' && (
          <ServicesScreen
            onSelectService={handleSelectService}
            onOpenCounselling={(service) => {
              handleOpenCounsellingWithPlan(service ? `${service.title} Track` : undefined);
            }}
            onStartMatching={() => setIsSmartMatchingOpen(true)}
            setActivePage={setActivePage}
          />
        )}

        {/* 8. HOW IT WORKS SCREEN */}
        {activePage === 'how-it-works' && (
          <HowItWorksScreen
            onStartMatching={() => setIsSmartMatchingOpen(true)}
            onOpenCounselling={() => handleOpenCounsellingWithPlan()}
            onBecomeMentor={() => setIsBecomeMentorOpen(true)}
            setActivePage={setActivePage}
          />
        )}

        {/* 9. PLANS & PRICING SCREEN */}
        {activePage === 'plans' && (
          <PlansScreen
            onSelectPlan={handleSelectPlan}
            onOpenCounselling={() => handleOpenCounsellingWithPlan()}
            setActivePage={setActivePage}
          />
        )}

        {/* 10. RESOURCES & PLAYBOOKS SCREEN */}
        {activePage === 'resources' && (
          <ResourcesScreen
            onSelectArticle={handleSelectArticle}
            onOpenCounselling={() => handleOpenCounsellingWithPlan()}
            setActivePage={setActivePage}
          />
        )}

        {/* 11. EXPLORE MENTORS SCREEN */}
        {(activePage === 'features' || activePage === 'mentors') && (
          <MentorsScreen
            onSelectMentor={handleSelectMentorForBio}
            onBookMentor={handleBookMentor}
            onStartMatching={() => setIsSmartMatchingOpen(true)}
            onBecomeMentor={() => setIsBecomeMentorOpen(true)}
            setActivePage={setActivePage}
          />
        )}

        {/* 12. ABOUT US SCREEN */}
        {activePage === 'about-us' && (
          <AboutUsScreen
            setActivePage={setActivePage}
            onStartMatching={() => setIsSmartMatchingOpen(true)}
            onBecomeMentor={() => setIsBecomeMentorOpen(true)}
            onOpenCounselling={() => handleOpenCounsellingWithPlan()}
            onSelectLeader={handleSelectLeader}
            siteSettings={siteSettings}
          />
        )}

        {/* 13. CONTACT US SCREEN */}
        {activePage === 'contact' && (
          <ContactScreen
            onLeadSubmitted={() => setLeadCounter(prev => prev + 1)}
            setActivePage={setActivePage}
            siteSettings={siteSettings}
          />
        )}

        {/* LEGAL PAGES */}
        {(activePage === 'privacy' || activePage === 'terms' || activePage === 'refund') && (
          <LegalScreen kind={activePage} setActivePage={setActivePage} siteSettings={siteSettings} />
        )}

        {/* 14. COUNSELLING DEDICATED SCREEN */}
        {activePage === 'counselling' && (
          <CounsellingScreen 
            siteSettings={siteSettings}
            onLeadSubmitted={() => setLeadCounter(prev => prev + 1)} 
            setActivePage={setActivePage}
          />
        )}

        {/* 15. ADMIN WORKSPACE */}
        {activePage === 'admin' && (
          <AdminAuthGate>
            <AdminScreen setActivePage={setActivePage} />
          </AdminAuthGate>
        )}

        {/* 16. LEADS DASHBOARD */}
        {activePage === 'leads-dashboard' && (
          <AdminAuthGate>
            <LeadsDashboardScreen setActivePage={setActivePage} />
          </AdminAuthGate>
        )}

        {/* 17. INDIVIDUAL LEADER PROFILE SCREEN */}
        {activePage === 'leader-profile' && (
          <LeaderProfileScreen
            slug={selectedLeaderSlug}
            onSelectLeader={handleSelectLeader}
            setActivePage={setActivePage}
            onOpenCounselling={() => handleOpenCounsellingWithPlan(`Consultation with Leadership Team`)}
            previousPage={previousNavPage}
          />
        )}

        {/* 18. CANDIDATE DASHBOARD SCREEN */}
        {activePage === 'dashboard' && candidate && (
          <CandidateDashboardScreen
            key={candidate.id}
            siteSettings={siteSettings}
            setActivePage={setActivePage}
            candidate={candidate}
            onCandidateUpdate={setCandidate}
            onLogout={handleLogout}
          />
        )}
        {activePage === 'dashboard' && !candidate && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
            {authChecked ? (
              <>
                <h2 className="text-xl font-black text-[#061b3b]">Please log in to view your Candidate Area</h2>
                <p className="text-sm text-[#434652] max-w-md">
                  Sign in or create an account to see your profile, plan, payments and sessions.
                </p>
                <button
                  onClick={handleOpenLogin}
                  className="px-5 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  Login / Sign Up
                </button>
              </>
            ) : (
              <p className="text-sm text-[#434652]">Loading your account…</p>
            )}
          </div>
        )}

        </Suspense>
        </LazyBoundary>
      </main>

      {/* Footer */}
      <Footer
        setActivePage={setActivePage}
        siteSettings={siteSettings}
        onOpenContact={() => {
          setActivePage('contact');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSignup={handleOpenSignup}
        onOpenCounselling={() => handleOpenCounsellingWithPlan()}
      />

      <LazyBoundary compact>
      <Suspense fallback={<ModalFallback />}>
      {/* Free 1:1 Career Counselling Lead Capture Modal */}
      <WhenOpen open={isCounsellingOpen}>
      <CounsellingModal
        siteSettings={siteSettings}
        isOpen={isCounsellingOpen}
        onClose={() => setIsCounsellingOpen(false)}
        initialPlan={counsellingPlanInterest}
        onSuccess={() => {
          setLeadCounter(prev => prev + 1);
        }}
      />
      </WhenOpen>

      {/* Webinar Detail Modal */}
      <WhenOpen open={!!selectedWebinarForDetail}>
      <WebinarDetailModal
        isOpen={!!selectedWebinarForDetail}
        onClose={() => setSelectedWebinarForDetail(null)}
        webinar={selectedWebinarForDetail}
        onRegister={handleRegisterWebinar}
      />
      </WhenOpen>

      {/* Webinar Checkout Modal */}
      <WhenOpen open={!!webinarToCheckout}>
      <WebinarCheckoutModal
        isOpen={!!webinarToCheckout}
        onClose={() => setWebinarToCheckout(null)}
        webinar={webinarToCheckout}
        onRegistrationSuccess={handleWebinarSuccess}
      />
      </WhenOpen>

      {/* Service Detail Modal */}
      <WhenOpen open={!!selectedService}>
      <ServiceDetailModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onBookService={(service) => {
          setSelectedService(null);
          handleOpenCounsellingWithPlan(`${service.title} Guidance`);
        }}
      />
      </WhenOpen>

      {/* Resource Article Reader Modal */}
      <WhenOpen open={!!selectedArticle}>
      <ArticleReaderModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onBookCounselling={() => {
          setSelectedArticle(null);
          handleOpenCounsellingWithPlan('Playbook Follow-up Guidance');
        }}
      />
      </WhenOpen>

      {/* Mentor Profile / Bio Detail Modal */}
      <WhenOpen open={!!bioMentor}>
      <MentorProfileModal
        mentor={bioMentor}
        isOpen={!!bioMentor}
        onClose={() => setBioMentor(null)}
        onBookCall={(mentor) => {
          setBioMentor(null);
          setBookingMentor(mentor);
        }}
      />
      </WhenOpen>

      {/* Master Session Booking Modal */}
      <WhenOpen open={!!bookingMentor}>
      <BookingModal
        mentor={bookingMentor}
        isOpen={!!bookingMentor}
        onClose={() => setBookingMentor(null)}
        onConfirmBooking={handleConfirmBooking}
      />
      </WhenOpen>

      {/* AI/Rule-based Smart Matching Modal */}
      <WhenOpen open={isSmartMatchingOpen}>
      <SmartMatchingModal
        isOpen={isSmartMatchingOpen}
        onClose={() => setIsSmartMatchingOpen(false)}
        onSelectMentor={(mentor) => {
          setIsSmartMatchingOpen(false);
          setBioMentor(mentor);
        }}
        onBookMentor={(mentor) => {
          setIsSmartMatchingOpen(false);
          setBookingMentor(mentor);
        }}
      />
      </WhenOpen>

      {/* Become a Mentor Application Modal */}
      <WhenOpen open={isBecomeMentorOpen}>
      <BecomeMentorModal
        isOpen={isBecomeMentorOpen}
        onClose={() => setIsBecomeMentorOpen(false)}
      />
      </WhenOpen>

      {/* Authentication Modal */}
      <WhenOpen open={isAuthOpen}>
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => {
          setIsAuthOpen(false);
          setSocialAuthMessage(null);
          setStartInForgot(false);
        }}
        externalError={socialAuthMessage}
        startInForgot={startInForgot}
        onAuthenticate={handleAuthenticate}
      />
      </WhenOpen>

      {linkCode && (
        <LinkAccountModal
          code={linkCode}
          onClose={() => setLinkCode(null)}
          onLinked={(body) => {
            setLinkCode(null);
            setCandidateToken(body.token, body.expiresAt);
            setCandidate(body.candidate);
            setActivePage('dashboard');
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      {resetToken && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => setResetToken(null)}
          onSignIn={() => {
            setResetToken(null);
            setStartInForgot(false);
            setAuthMode('login');
            setIsAuthOpen(true);
          }}
          onRequestNewLink={() => {
            setResetToken(null);
            setStartInForgot(true);
            setAuthMode('login');
            setIsAuthOpen(true);
          }}
        />
      )}

      </Suspense>
      </LazyBoundary>

<PaymentStatusBanner />
<AICareerAssistant />

    </div>
  );
}
