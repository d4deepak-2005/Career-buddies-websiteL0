import { getCandidateToken, candidateFetch } from './candidateAuth';

export interface CheckoutRequest {
  itemType: 'webinar' | 'plan' | 'programme';
  itemId?: string;
  itemName?: string;
  customer: { name: string; email: string; mobile?: string };
  details?: Record<string, unknown>;
}

export interface CheckoutQuote {
  itemName: string;
  amount: number;
  currency: string;
  testMode: boolean;
}

// What the server will charge (verified against the Dodo product). Display only: the amount is never sent back.
export async function getCheckoutQuote(
  itemType: CheckoutRequest['itemType'],
  itemId?: string
): Promise<{ ok: true; quote: CheckoutQuote } | { ok: false; error: string }> {
  if (!getCandidateToken()) return { ok: false, error: 'Please log in or create a free account to complete your purchase.' };
  try {
    const res = await candidateFetch('/api/payments/quote', { method: 'POST', body: JSON.stringify({ itemType, itemId }) });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, quote: data as CheckoutQuote };
    return { ok: false, error: data.error || 'Online payment is currently unavailable for this item.' };
  } catch {
    return { ok: false, error: 'Unable to reach the server. Please try again.' };
  }
}

// Asks the server to create a Dodo Payments checkout session and, on success,
// redirects the browser to Dodo's hosted checkout page. The price is defined
// by the Dodo product on the server; no amount or secret is sent from here.
export async function startCheckout(
  request: CheckoutRequest
): Promise<{ ok: boolean; error?: string }> {
  // Checkout is tied to the logged-in candidate account (identified by the server session).
  const token = getCandidateToken();
  if (!token) {
    return { ok: false, error: 'Please log in or create a free account to complete your purchase.' };
  }

  try {
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
    });
    const data = await res.json();

    if (res.ok && data.success && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return { ok: true };
    }
    // A payment for this item is already being processed: show its status instead of starting another.
    if (res.ok && data.success && data.alreadyProcessing && data.orderRef) {
      window.location.href = `/?order=${encodeURIComponent(data.orderRef)}`;
      return { ok: true };
    }

    return {
      ok: false,
      error: data.error || 'Unable to start payment. Please try again.',
    };
  } catch (err) {
    return { ok: false, error: 'Unable to reach the server. Please try again.' };
  }
}
