import React, { useEffect } from 'react';
import { Clock, MessageSquare, Mail } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { SiteSettingsData, pickText } from '../../hooks/useSiteSettings';
import { getContactInfo } from '../../utils/contactInfo';

interface MaintenanceScreenProps {
  siteSettings?: SiteSettingsData | null;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ siteSettings }) => {
  const contact = getContactInfo(siteSettings);
  const title = pickText(siteSettings?.maintenance?.title, "We'll be back shortly");
  const message = pickText(
    siteSettings?.maintenance?.message,
    'CareerBuddies is undergoing scheduled maintenance. Please check back soon — your career guidance will be ready when we return.'
  );
  const eta = siteSettings?.maintenance?.eta?.trim();

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | CareerBuddies`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#061b3b] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl bg-white border border-[#e0e8ff] rounded-3xl shadow-xs p-8 sm:p-10 text-center">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" src={siteSettings?.header?.logoUrl} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dae2ff] text-[#001947] border border-[#cbdaff] text-xs font-bold mb-4">
            <Clock className="w-3.5 h-3.5 text-[#006e29]" />
            <span>Temporarily unavailable</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">{title}</h1>
          <p className="text-sm text-[#434652] leading-relaxed mb-4">{message}</p>
          {eta && (
            <p className="text-xs font-bold text-[#006e29] bg-[#79fd8d]/20 rounded-xl px-3 py-2 mb-6">
              Expected back: {eta}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <a
              href={contact.whatsappLink('Hi CareerBuddies team, I saw the site is under maintenance. Please let me know when you are back.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp us</span>
            </a>
            <a
              href={`mailto:${contact.supportEmail}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#cbdaff] text-[#002869] hover:bg-[#f1f3ff] text-xs font-bold transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{contact.supportEmail}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
