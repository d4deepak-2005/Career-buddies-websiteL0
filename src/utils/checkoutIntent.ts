import { PlanItem, ProgrammeItem, WebinarItem } from '../types';

// Describes a checkout the visitor was about to start when we asked them to
// sign in. Persisted in sessionStorage so the flow survives the social-login
// redirect (the provider round-trip reloads the app at the site root).
export type PendingCheckout =
  | { type: 'webinar'; item: WebinarItem }
  | { type: 'programme'; item: ProgrammeItem }
  | { type: 'plan'; item: PlanItem };

const STORAGE_KEY = 'cb_pending_checkout_v1';

export function savePendingCheckout(intent: PendingCheckout): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // storage unavailable — the email/password login path still resumes in-page
  }
}

export function loadPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const valid = parsed && typeof parsed === 'object' &&
      (parsed.type === 'webinar' || parsed.type === 'programme' || parsed.type === 'plan') &&
      parsed.item && typeof parsed.item === 'object';
    return valid ? (parsed as PendingCheckout) : null;
  } catch {
    return null;
  }
}

export function clearPendingCheckout(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
