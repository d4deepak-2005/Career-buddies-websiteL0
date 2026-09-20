import React from 'react';
import { PageView } from '../../types';
import { PageNavigationControls } from '../common/PageNavigationControls';
import { getContactInfo } from '../../utils/contactInfo';
import { SiteSettingsData } from '../../hooks/useSiteSettings';

export type LegalKind = 'privacy' | 'terms' | 'refund';

interface LegalScreenProps {
  kind: LegalKind;
  setActivePage: (page: PageView) => void;
  siteSettings?: SiteSettingsData | null;
}

interface LegalSection {
  heading: string;
  body: string[];
}

// NOTE: These policies are DRAFT placeholder text based only on what the site already
// states. They contain no certifications, registrations or compliance claims and must
// be reviewed by the company's legal advisor before being treated as final.
// %%EMAIL%% / %%ADDRESS%% are filled from Site Settings (or the built-in defaults) when the page renders.
const CONTACT_LINE = 'CareerBuddies, %%ADDRESS%%. Email: %%EMAIL%%.';

const DOCUMENTS: Record<LegalKind, { title: string; intro: string; sections: LegalSection[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This page explains, in plain language, what information CareerBuddies collects through this website and how it is used.',
    sections: [
      {
        heading: 'Information you give us',
        body: [
          'When you submit a form (for example counselling, contact, mentor application or session booking) we collect the details you enter, such as your name, mobile number, email address, current role, experience and any message you write.',
          'If you create a candidate account we store your account details (name, email and a securely hashed password, or the sign-in provider you used) and the profile information you add.',
        ],
      },
      {
        heading: 'How we use it',
        body: [
          'We use your details to respond to your enquiry, arrange counselling or mentoring sessions, provide your candidate account, and contact you about the services you asked about.',
        ],
      },
      {
        heading: 'AI career assistant',
        body: [
          'Messages you type into the AI career assistant are sent to a third-party AI service in order to generate a reply. Please do not enter sensitive personal information into the assistant.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'Online payments, where offered, are handled by a third-party payment provider. CareerBuddies does not store your card details.',
        ],
      },
      {
        heading: 'Sharing and retention',
        body: [
          'We do not sell your personal information. Your details are accessible to the CareerBuddies team and to the service providers that help us run the website. [Retention period: to be confirmed by the company.]',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          `To ask about, correct or delete your information, contact us at %%EMAIL%%.`,
        ],
      },
      {
        heading: 'Contact',
        body: [CONTACT_LINE],
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'These terms describe the basic rules for using the CareerBuddies website and services.',
    sections: [
      {
        heading: 'About our services',
        body: [
          'CareerBuddies provides career counselling, mentorship sessions, webinars, programmes and related resources. Information on this website is general guidance and is not a promise of any particular job, promotion or salary outcome.',
        ],
      },
      {
        heading: 'Using the website',
        body: [
          'Please provide accurate details when you submit a form or create an account, keep your login details private, and do not misuse the website, attempt to access other users’ data, or interfere with its operation.',
        ],
      },
      {
        heading: 'Bookings and payments',
        body: [
          'Submitting a booking or counselling request is a request only; our team will contact you to confirm the session. Prices, dates and availability are shown on the relevant page and may change. Paid services are subject to the Refund / Cancellation Policy.',
        ],
      },
      {
        heading: 'Content',
        body: [
          'The website content, branding and materials belong to CareerBuddies or its content providers and may not be copied or reused without permission.',
        ],
      },
      {
        heading: 'Changes and governing law',
        body: [
          'We may update these terms from time to time. [Governing law and jurisdiction: to be confirmed by the company.]',
        ],
      },
      {
        heading: 'Contact',
        body: [CONTACT_LINE],
      },
    ],
  },
  refund: {
    title: 'Refund / Cancellation Policy',
    intro: 'This page summarises how cancellations and refunds are handled for CareerBuddies services.',
    sections: [
      {
        heading: 'Satisfaction guarantee',
        body: [
          'As stated on our website: if your first session with a matched mentor is not valuable to you, we will rematch you with another mentor or refund the session fee within 48 hours of your request.',
        ],
      },
      {
        heading: 'Cancelling or rescheduling',
        body: [
          'To cancel or reschedule a session, contact us as early as possible using the details below. [Cancellation notice period: to be confirmed by the company.]',
        ],
      },
      {
        heading: 'Webinars, programmes and plans',
        body: [
          '[Refund terms for webinars, programmes and plans: to be confirmed by the company.]',
        ],
      },
      {
        heading: 'How to request a refund',
        body: [
          `Email %%EMAIL%% with your name, the email you used and the service concerned. Approved refunds are returned to the original payment method.`,
        ],
      },
      {
        heading: 'Contact',
        body: [CONTACT_LINE],
      },
    ],
  },
};

export const LegalScreen: React.FC<LegalScreenProps> = ({ kind, setActivePage, siteSettings }) => {
  const doc = DOCUMENTS[kind];
  const contact = getContactInfo(siteSettings);
  const fill = (text: string) => text.split('%%EMAIL%%').join(contact.supportEmail).split('%%ADDRESS%%').join(contact.address);
  const go = (page: PageView) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-[#f9f9ff] py-10 px-4 sm:px-6 lg:px-10">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">
        <PageNavigationControls
          onBackToHome={() => go('home')}
          onBack={() => window.history.back()}
          backLabel="Back"
          currentStepLabel={doc.title}
        />

        <article className="bg-white rounded-3xl border border-[#cbdaff] shadow-2xs p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-black text-[#002869] tracking-tight break-words">{doc.title}</h1>
          <p className="mt-2 text-xs font-bold text-[#666a76]">
            Draft — pending legal review. Last updated: to be confirmed.
          </p>
          <p className="mt-4 text-sm text-[#434652] leading-relaxed">{fill(doc.intro)}</p>

          <div className="mt-6 flex flex-col gap-6">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base sm:text-lg font-black text-[#061b3b]">{section.heading}</h2>
                {section.body.map((text, i) => (
                  <p key={i} className="mt-2 text-sm text-[#434652] leading-relaxed break-words">{fill(text)}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};
