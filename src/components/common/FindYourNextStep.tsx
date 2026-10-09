import React from 'react';
import { PageView, WebinarItem } from '../../types';
import { buttonProps } from '../../utils/a11y';
import { useWebinarOffer, withEntryPrice } from '../../hooks/useCmsCatalog';
import { resolveNextStepContent } from '../../config/homeNextStep';
import { SiteSettingsData } from '../../hooks/useSiteSettings';
import { Reveal, RevealItem, Stagger } from '../home/MotionReveal';
import { 
  Compass, 
  RefreshCw, 
  TrendingUp, 
  GraduationCap, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface FindYourNextStepProps {
  onNavigate: (page: PageView) => void;
  onOpenCounselling?: () => void;
  onOpenLiveWebinar?: (webinar?: WebinarItem | null) => void;
  home?: SiteSettingsData['home'] | null;
}

const CARD_ICONS = [Compass, RefreshCw, TrendingUp, GraduationCap];

export const FindYourNextStep: React.FC<FindYourNextStepProps> = ({
  onNavigate,
  onOpenCounselling,
  onOpenLiveWebinar,
  home,
}) => {
  const { hasLive, priceINR: entryPrice, webinar: liveWebinar } = useWebinarOffer();
  const content = resolveNextStepContent(home);

  const handleCardClick = (targetPage: string) => {
    if (targetPage === 'counselling' && onOpenCounselling) {
      onOpenCounselling();
    } else if (targetPage === 'webinars' && onOpenLiveWebinar && liveWebinar) {
      onOpenLiveWebinar(liveWebinar);
    } else {
      onNavigate(targetPage as PageView);
    }
  };

  const cards = content.cards.filter((card) => hasLive || card.targetPage !== 'webinars');

  return (
    <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-[#f9f9ff] border-y border-[#e0e8ff]/70">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-10 sm:gap-12">
        
        <Reveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className="max-w-2xl flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dae2ff] text-[#001947] text-xs font-bold w-fit">
              <Compass className="w-3.5 h-3.5 text-[#002869]" />
              <span>{content.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#061b3b] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
              {content.title}
            </h2>
            <p className="text-sm sm:text-base text-[#434652] leading-relaxed">
              {content.description}
            </p>
          </div>

          <button
            onClick={() => handleCardClick(content.ctaPage)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#002869]/20 text-[#002869] hover:bg-[#dae2ff]/30 text-xs font-bold transition-all shadow-xs w-fit cursor-pointer shrink-0"
          >
            <span>{content.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        </Reveal>

        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {cards.map((opt, index) => {
            const isGreen = opt.color === 'green';
            const Icon = CARD_ICONS[index % CARD_ICONS.length] || Sparkles;
            return (
              <RevealItem key={`${opt.title}-${index}`} hover className="h-full">
              <div
                {...buttonProps(() => handleCardClick(opt.targetPage))}
                className={`h-full bg-white rounded-3xl p-6 border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between group ${
                  isGreen 
                    ? 'border-[#a6f5b7]/60 hover:border-[#006e29]' 
                    : 'border-[#cbdaff]/70 hover:border-[#002869]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={`p-2.5 rounded-xl ${
                      isGreen ? 'bg-[#79fd8d]/20 text-[#006e29]' : 'bg-[#dae2ff] text-[#002869]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {opt.badge && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isGreen ? 'bg-[#79fd8d]/25 text-[#00531d]' : 'bg-[#dae2ff] text-[#001947]'
                    }`}>
                      {withEntryPrice(opt.badge, entryPrice)}
                    </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#061b3b] group-hover:text-[#002869] transition-colors mb-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                    {opt.title}
                  </h3>

                  {opt.subtitle && (
                  <p className="text-xs font-medium text-[#666a76] mb-3">
                    {opt.subtitle}
                  </p>
                  )}

                  <p className="text-xs text-[#434652] leading-relaxed mb-4">
                    {withEntryPrice(opt.description, entryPrice)}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${
                    isGreen ? 'text-[#006e29]' : 'text-[#002869]'
                  }`}>
                    {opt.ctaText}
                  </span>
                  <div className={`p-1 rounded-full transition-transform group-hover:translate-x-1 ${
                    isGreen ? 'bg-[#79fd8d]/25 text-[#006e29]' : 'bg-[#dae2ff] text-[#002869]'
                  }`}>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
              </RevealItem>
            );
          })}
        </Stagger>

      </div>
    </section>
  );
};
