import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PageView } from '../types';
import { BrandLogo } from './BrandLogo';
import { 
  Menu, 
  X, 
  Sparkles, 
  User, 
  ChevronDown,
  Compass,
  BookOpen,
  Award,
  Users,
  Clock,
  ShieldCheck,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { SiteSettingsData } from '../hooks/useSiteSettings';
import { navTabMeta, visibleNavTabs } from '../config/navTabs';
import { getUrlForRoute } from '../utils/routes';

const ease = [0.22, 1, 0.36, 1] as const;

const navStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.16 } },
};

const navGroup = {
  hidden: { opacity: 0, y: -10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease, staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const navItem = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
};

const mobileStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

interface NavbarProps {
  activePage: PageView;
  setActivePage: (page: PageView) => void;
  onOpenCounselling: (planTitle?: string) => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onOpenUserDashboard: () => void;
  // Logged-in candidate's first name (undefined = logged out) and logout handler.
  candidateName?: string;
  onLogout?: () => void;
  bookedCount?: number;
  // Site Settings singleton, fetched once in App.tsx. Undefined/null while
  // loading or unavailable — every usage below falls back to today's content.
  siteSettings?: SiteSettingsData | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  onOpenCounselling,
  onOpenLogin,
  onOpenSignup,
  onOpenUserDashboard,
  candidateName,
  onLogout,
  bookedCount = 0,
  siteSettings
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Close explore dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setExploreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape closes an open menu and returns focus to the button that opened it.
  useEffect(() => {
    if (!exploreOpen && !mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (exploreOpen) {
        setExploreOpen(false);
        document.getElementById('nav-more-dropdown-btn')?.focus();
      } else if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        document.getElementById('nav-mobile-toggle-btn')?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [exploreOpen, mobileMenuOpen]);

  const handleNav = (page: PageView) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    setExploreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { top: topTabs, more: moreTabs } = visibleNavTabs(siteSettings?.header?.navItems);
  const isExploreActive = moreTabs.some((item) =>
    item.page === activePage ||
    (item.page === 'mentors' && activePage === 'features') ||
    (item.page === 'leadership' && activePage === 'leader-profile')
  );

  const topTabClass = (page: PageView, extra = '') =>
    `px-3 lg:px-3.5 xl:px-4 py-1.5 text-[13px] lg:text-[14px] xl:text-[15px] font-bold tracking-tight transition-all cursor-pointer rounded-xl items-center gap-1.5 ${extra} ${
      activePage === page
        ? 'text-[#002869] bg-[#dae2ff]/80 border border-[#cbdaff]/70 shadow-2xs font-extrabold'
        : 'text-[#434652] hover:text-[#002869] hover:bg-[#f1f4fe] border border-transparent'
    }`;

  const moreIcon = (page: PageView) => {
    if (page === 'how-it-works') return <Sparkles className="w-3.5 h-3.5 text-[#006e29]" />;
    if (page === 'webinars') return <Calendar className="w-3.5 h-3.5 text-[#006e29]" />;
    if (page === 'mentors') return <Users className="w-3.5 h-3.5 text-[#006e29]" />;
    if (page === 'leadership') return <Users className="w-3.5 h-3.5 text-[#002869]" />;
    if (page === 'success-stories') return <Award className="w-3.5 h-3.5 text-[#006e29]" />;
    if (page === 'resources') return <BookOpen className="w-3.5 h-3.5 text-[#002869]" />;
    if (page === 'career-check-in') return <Compass className="w-3.5 h-3.5 text-[#002869]" />;
    if (page === 'about-us') return <ShieldCheck className="w-3.5 h-3.5 text-[#002869]" />;
    if (page === 'contact') return <MessageSquare className="w-3.5 h-3.5 text-[#002869]" />;
    return <Clock className="w-3.5 h-3.5 text-[#002869]" />;
  };

  return (
    <motion.header
      className="relative sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#cbdaff]/70 shadow-[0_2px_14px_rgba(0,40,105,0.04)]"
      initial={reduceMotion ? false : { opacity: 0, y: -22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
    >
      <motion.div
        className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 py-1 flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6"
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
        variants={navStagger}
      >
        
        {/* Left Side: Prominent, Wide Official CareerBuddies Logo Presentation Area */}
        <motion.div className="flex items-center shrink-0" variants={navItem}>
          <a 
            href="/"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                handleNav('home');
              }
            }}
            className="group relative inline-flex items-center pr-1.5 sm:pr-2 rounded-2xl transition-all duration-200 cursor-pointer select-none bg-gradient-to-r from-transparent via-[#f4f7ff]/40 to-transparent hover:via-[#dae2ff]/25 border border-transparent hover:border-[#cbdaff]/40 hover:shadow-2xs active:scale-[0.99]"
            title="CareerBuddies - Home"
          >
            {/* Subtle soft backdrop ambient aura for premium prominence */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#dae2ff]/10 via-[#79fd8d]/5 to-[#dae2ff]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative z-10 flex items-center">
              <BrandLogo
                size="header"
                src={siteSettings?.header?.logoUrl}
                className="cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
              />
            </div>
          </a>
        </motion.div>

        {/* Center: Clean Core Navigation Items (Home | Services | Programmes | More ▼) */}
        <motion.nav
          aria-label="Main"
          className="hidden md:flex flex-1 justify-center items-center gap-0.5 lg:gap-1"
          variants={navGroup}
        >
          {topTabs.map((item) => (
            <motion.a
              key={item.page}
              id={`nav-${item.page}-btn`}
              href={getUrlForRoute(item.page)}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  handleNav(item.page);
                }
              }}
              className={topTabClass(
                item.page,
                item.page === 'career-check-in' ? 'hidden lg:flex whitespace-nowrap' : 'flex'
              )}
              variants={navItem}
            >
              <span>{item.label}</span>
              {activePage === item.page && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#002869]" />
              )}
            </motion.a>
          ))}

          {moreTabs.length > 0 && (
          <motion.div className="relative" ref={exploreRef} variants={navItem}>
            <button
              id="nav-more-dropdown-btn"
              onClick={() => setExploreOpen(!exploreOpen)}
              className={`px-3 lg:px-3.5 xl:px-4 py-1.5 text-[13px] lg:text-[14px] xl:text-[15px] font-bold tracking-tight transition-all cursor-pointer rounded-xl flex items-center gap-1.5 ${
                exploreOpen || isExploreActive
                  ? 'text-[#002869] bg-[#dae2ff]/80 border border-[#cbdaff]/70 shadow-2xs font-extrabold'
                  : 'text-[#434652] hover:text-[#002869] hover:bg-[#f1f4fe] border border-transparent'
              }`}
              aria-expanded={exploreOpen}
              aria-haspopup="true"
              aria-controls="nav-more-menu"
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${exploreOpen ? 'rotate-180 text-[#002869]' : 'text-[#666a76]'}`} />
            </button>

            {exploreOpen && (
              <div id="nav-more-menu" className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl border border-[#cbdaff] shadow-xl shadow-[#002869]/8 p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                {moreTabs.map((item) => {
                  const meta = navTabMeta(item.page);
                  const featured = item.page === 'how-it-works';
                  return (
                    <a
                      key={item.page}
                      id={`more-${item.page}-btn`}
                      href={getUrlForRoute(item.page)}
                      onClick={(e) => {
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                          e.preventDefault();
                          handleNav(item.page);
                        }
                      }}
                      className={
                        featured
                          ? 'w-full text-left p-3 rounded-xl bg-[#f1f3ff] hover:bg-[#dae2ff] border border-[#cbdaff] transition-all flex items-center justify-between mb-1.5 cursor-pointer shadow-2xs group'
                          : 'w-full text-left p-2.5 rounded-xl hover:bg-[#f1f3ff] transition-colors flex items-center justify-between cursor-pointer'
                      }
                    >
                      <div>
                        <div className={`text-xs flex items-center gap-1.5 ${featured ? 'font-black text-[#002869]' : 'font-bold text-[#061b3b]'}`}>
                          {moreIcon(item.page)}
                          <span className={item.page === 'webinars' ? 'uppercase' : undefined}>{item.label}</span>
                        </div>
                        {meta?.description && (
                          <p className={`text-[11px] text-[#434652] mt-0.5 ${featured ? 'font-medium' : ''}`}>{meta.description}</p>
                        )}
                      </div>
                      {meta?.badge && (
                        <span className={featured
                          ? 'px-2 py-0.5 rounded-md bg-[#002869] text-white text-[11px] font-black shadow-xs'
                          : 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dae2ff] text-[#001947]'
                        }>
                          {meta.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </motion.div>
          )}
        </motion.nav>

        {/* Right Action Controls: [Login / Sign Up] + [Dashboard/Profile] */}
        <motion.div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto" variants={navGroup}>
          
          {/* Combined Login / Sign Up Button */}
          <motion.button
            id="nav-auth-btn"
            onClick={candidateName ? onLogout : onOpenLogin}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#002869] hover:bg-[#0b3d91] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title={candidateName ? `Signed in as ${candidateName} — click to log out` : 'Sign in or create a CareerBuddies account'}
            variants={navItem}
          >
            <span>{candidateName ? 'Logout' : 'Login / Sign Up'}</span>
          </motion.button>

          {/* User Account / Bookings Dashboard Button */}
          <motion.button
            id="nav-profile-btn"
            onClick={onOpenUserDashboard}
            className="relative w-9 h-9 rounded-xl bg-[#dae2ff]/90 hover:bg-[#cbdaff] text-[#002869] flex items-center justify-center transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0 border border-[#cbdaff]"
            title="My Career Dashboard & Bookings"
            aria-label="My Career Dashboard & Bookings"
            variants={navItem}
          >
            <User className="w-4 h-4 text-[#002869]" />
            {bookedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#006e29] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {bookedCount}
              </span>
            )}
          </motion.button>

          {/* Mobile Menu Toggle Button */}
          <motion.button
            id="nav-mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#061b3b] hover:bg-[#e8edff] transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="nav-mobile-menu"
            variants={navItem}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </motion.button>
        </motion.div>
      </motion.div>
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-[#002869] via-[#79fd8d] to-[#002869]"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 1.15, delay: 0.1, ease, times: [0, 0.55, 1] }}
        />
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <motion.div
          id="nav-mobile-menu"
          className="md:hidden border-t border-[#cbdaff] bg-white px-6 py-5 shadow-2xl max-h-[85vh] overflow-y-auto"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease }}
        >
          <motion.div
            className="flex flex-col gap-2"
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
            variants={mobileStagger}
          >
            {topTabs.map((item) => (
              <motion.a
                key={item.page}
                href={getUrlForRoute(item.page)}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    handleNav(item.page);
                  }
                }}
                variants={navItem}
                className={`text-left px-4 py-3 rounded-xl text-sm font-black flex items-center justify-between ${
                  activePage === item.page ? 'bg-[#002869] text-white' : 'text-[#434652] hover:bg-[#f1f3ff]'
                }`}
              >
                <span>{item.label}</span>
              </motion.a>
            ))}

            {moreTabs.length > 0 && (
            <motion.div className="py-2 border-t border-gray-100 my-1 flex flex-col gap-1" variants={navItem}>
              <div className="text-[11px] font-black uppercase text-[#002869] tracking-wider px-4 mb-1">
                More Features
              </div>
              {moreTabs.map((item) => {
                const meta = navTabMeta(item.page);
                return (
                  <a
                    key={item.page}
                    href={getUrlForRoute(item.page)}
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault();
                        handleNav(item.page);
                      }
                    }}
                    className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                      activePage === item.page
                        ? item.page === 'webinars' ? 'bg-[#006e29] text-white' : 'bg-[#002869] text-white'
                        : 'text-[#434652] hover:bg-[#f1f3ff]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {meta?.badge && activePage !== item.page && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dae2ff] text-[#001947]">{meta.badge}</span>
                    )}
                  </a>
                );
              })}
            </motion.div>
            )}

            {/* Mobile Auth & User Dashboard Buttons */}
            <motion.div className="pt-3 border-t border-gray-100 flex flex-col gap-2" variants={navItem}>
              <button
                id="mobile-nav-auth-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (candidateName) onLogout?.();
                  else onOpenLogin();
                }}
                className="w-full py-3 bg-[#002869] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#79fd8d]" />
                <span>{candidateName ? 'Logout' : 'Login / Sign Up'}</span>
              </button>

              <button
                id="mobile-nav-dashboard-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenUserDashboard();
                }}
                className="w-full py-3 bg-[#dae2ff] text-[#002869] hover:bg-[#cbdaff] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs border border-[#cbdaff] cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#002869]" />
                <span>My Career Dashboard & Progress</span>
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Navbar;
