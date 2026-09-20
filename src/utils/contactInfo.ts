import { OFFICE_DETAILS } from '../data/mockData';
import { SiteSettingsData, pickText } from '../hooks/useSiteSettings';

// One place that decides which public contact details the site shows. A value an admin has
// entered in Site Settings wins; otherwise the built-in default (unchanged from before) is used,
// so an empty Site Settings record never blanks out a contact detail.

const DEFAULT_WHATSAPP_MESSAGE = 'Hi CareerBuddies team, I would like to know more about career counselling and mentorship.';

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

export interface ContactInfo {
  address: string;
  supportEmail: string;
  /** Number shown on screen, e.g. "+91 9310288270". */
  whatsappPrimary: string;
  /** Second desk number (no Site Settings field exists for it). */
  whatsappSecondary: string;
  whatsappLink: (message?: string, number?: string) => string;
}

export function getContactInfo(settings?: SiteSettingsData | null): ContactInfo {
  const primary = pickText(settings?.general?.whatsappNumber, OFFICE_DETAILS.primaryWhatsapp);
  return {
    address: pickText(settings?.contact?.address, OFFICE_DETAILS.address),
    supportEmail: pickText(settings?.contact?.email || settings?.general?.supportEmail, OFFICE_DETAILS.supportEmail),
    whatsappPrimary: primary,
    whatsappSecondary: OFFICE_DETAILS.secondaryWhatsapp,
    whatsappLink: (message = DEFAULT_WHATSAPP_MESSAGE, number = primary) =>
      `https://wa.me/${digitsOnly(number) || digitsOnly(OFFICE_DETAILS.primaryWhatsapp)}?text=${encodeURIComponent(message)}`,
  };
}
