import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { AdminAuthGate } from './components/common/AdminAuthGate';
import { PaymentStatusBanner } from './components/common/PaymentStatusBanner';

// Screens
import { HomeScreen } from './components/screens/HomeScreen';
import { ServicesScreen } from './components/screens/ServicesScreen';
import { ProgrammesScreen } from './components/screens/ProgrammesScreen';
import { LeadershipScreen } from './components/screens/LeadershipScreen';
import { SuccessStoriesScreen } from './components/screens/SuccessStoriesScreen';
import { HowItWorksScreen } from './components/screens/HowItWorksScreen';
import { PlansScreen } from './components/screens/PlansScreen';
import { ResourcesScreen } from './components/screens/ResourcesScreen';
import { MentorsScreen } from './components/screens/MentorsScreen';
import { AboutUsScreen } from './components/screens/AboutUsScreen';
import { ContactScreen } from './components/screens/ContactScreen';
import { CounsellingScreen } from './components/screens/CounsellingScreen';
import { LeadsDashboardScreen } from './components/screens/LeadsDashboardScreen';
import { CareerCheckInScreen } from './components/screens/CareerCheckInScreen';
import { WebinarsScreen } from './components/screens/WebinarsScreen';
import { AdminScreen } from './components/screens/AdminScreen';
import { LeaderProfileScreen } from './components/screens/LeaderProfileScreen';
import { CandidateDashboardScreen } from './components/dashboard/CandidateDashboardScreen';

// Modals
import { SmartMatchingModal } from './components/modals/SmartMatchingModal';
import { BookingModal } from './components/modals/BookingModal';
import { MentorProfileModal } from './components/modals/MentorProfileModal';
import { BecomeMentorModal } from './components/modals/BecomeMentorModal';
import { AuthModal } from './components/modals/AuthModal';
import {
  CandidateProfile,
  candidateFetch,
  clearCandidateToken,
  getCandidateToken,
  setCandidateToken
} from './utils/candidateAuth';
import { UserDashboardDrawer } from './components/modals/UserDashboardDrawer';
import { CounsellingModal } from './components/modals/CounsellingModal';
import { ServiceDetailModal } from './components/modals/ServiceDetailModal';
import { ArticleReaderModal } from './components/modals/ArticleReaderModal';
import { WebinarDetailModal } from './components/modals/WebinarDetailModal';
import { WebinarCheckoutModal } from './components/modals/WebinarCheckoutModal';

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
  const [activePage, setActivePage] = useState<PageView>('home');

  // Modals State
  const [isSmartMatchingOpen, setIsSmartMatchingOpen] = useState(false);
  const [isBecomeMentorOpen, setIsBecomeMentorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
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

  useLayoutEffect(() => {
    if (prevNavKey.current === null) {
      // First render: describe the current history entry.
      currentEntryId.current = newEntryId();
      window.history.replaceState(
        { ...(window.history.state || {}), cbPage: activePage, cbLeader: selectedLeaderSlug, cbId: currentEntryId.current },
        ''
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
          ''
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

  const handleCancelSession = (id: string) => {
    setBookedSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleOpenLogin = () => {
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
      <main className="flex-1 w-full">
        
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

        {/* 14. COUNSELLING DEDICATED SCREEN */}
        {activePage === 'counselling' && (
          <CounsellingScreen 
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

      {/* Free 1:1 Career Counselling Lead Capture Modal */}
      <CounsellingModal
        isOpen={isCounsellingOpen}
        onClose={() => setIsCounsellingOpen(false)}
        initialPlan={counsellingPlanInterest}
        onSuccess={() => {
          setLeadCounter(prev => prev + 1);
        }}
      />

      {/* Webinar Detail Modal */}
      <WebinarDetailModal
        isOpen={!!selectedWebinarForDetail}
        onClose={() => setSelectedWebinarForDetail(null)}
        webinar={selectedWebinarForDetail}
        onRegister={handleRegisterWebinar}
      />

      {/* Webinar Checkout Modal */}
      <WebinarCheckoutModal
        isOpen={!!webinarToCheckout}
        onClose={() => setWebinarToCheckout(null)}
        webinar={webinarToCheckout}
        onRegistrationSuccess={handleWebinarSuccess}
      />

      {/* Service Detail Modal */}
      <ServiceDetailModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onBookService={(service) => {
          setSelectedService(null);
          handleOpenCounsellingWithPlan(`${service.title} Guidance`);
        }}
      />

      {/* Resource Article Reader Modal */}
      <ArticleReaderModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onBookCounselling={() => {
          setSelectedArticle(null);
          handleOpenCounsellingWithPlan('Playbook Follow-up Guidance');
        }}
      />

      {/* Mentor Profile / Bio Detail Modal */}
      <MentorProfileModal
        mentor={bioMentor}
        isOpen={!!bioMentor}
        onClose={() => setBioMentor(null)}
        onBookCall={(mentor) => {
          setBioMentor(null);
          setBookingMentor(mentor);
        }}
      />

      {/* Master Session Booking Modal */}
      <BookingModal
        mentor={bookingMentor}
        isOpen={!!bookingMentor}
        onClose={() => setBookingMentor(null)}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* AI/Rule-based Smart Matching Modal */}
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

      {/* Become a Mentor Application Modal */}
      <BecomeMentorModal
        isOpen={isBecomeMentorOpen}
        onClose={() => setIsBecomeMentorOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticate={handleAuthenticate}
      />

      {/* User Dashboard & Bookings Drawer */}
      <UserDashboardDrawer
        isOpen={isUserDashboardOpen}
        onClose={() => setIsUserDashboardOpen(false)}
        sessions={bookedSessions}
        onCancelSession={handleCancelSession}
        onSelectMentor={handleSelectMentorForBio}
        onStartMatching={() => {
          setIsUserDashboardOpen(false);
          setIsSmartMatchingOpen(true);
        }}
      />
      
<PaymentStatusBanner />
<AICareerAssistant />

    </div>
  );
}
