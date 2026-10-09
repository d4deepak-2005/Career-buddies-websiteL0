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
  baseAmount?: number;
  gstAmount?: number;
  gstPercent?: number;
  currency: string;
  testMode: boolean;
  alreadyPaid?: boolean;
  orderRef?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay.'));
    document.body.appendChild(script);
  });
}

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

function openRazorpayCheckout(data: any, token: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!window.Razorpay) {
      resolve({ ok: false, error: 'Unable to open the payment window. Please try again.' });
      return;
    }

    const amountPaise = Math.round(Number(data.amount) || 0);
    const options: Record<string, unknown> = {
      key: data.keyId,
      amount: amountPaise,
      currency: data.currency || 'INR',
      name: 'CareerBuddies',
      description: data.description || `${data.itemName || 'CareerBuddies payment'} (incl. 18% GST)`,
      order_id: data.razorpayOrderId,
      prefill: {
        name: data.customer?.name || '',
        email: data.customer?.email || '',
        contact: data.customer?.mobile || '',
      },
      notes: { orderRef: data.orderRef },
      theme: { color: '#002869' },
      modal: {
        ondismiss: () => resolve({ ok: false, error: 'Checkout was closed before payment completed.' }),
      },
    };

    // UPI / netbanking leave this page. callback_url + redirect sends them back
    // to the site. Do not also pass handler — Razorpay then skips the redirect.
    if (data.callbackUrl) {
      options.callback_url = data.callbackUrl;
      options.redirect = true;
    } else {
      options.handler = async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verify = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(response),
          });
          const body = await verify.json();
          if (verify.ok && body.success && body.orderRef) {
            window.location.href = `/?order=${encodeURIComponent(body.orderRef)}`;
            resolve({ ok: true });
            return;
          }
          resolve({ ok: false, error: body.error || 'Payment could not be confirmed.' });
        } catch {
          resolve({ ok: false, error: 'Unable to confirm payment. Check Payment History shortly.' });
        }
      };
    }

    const checkout = new window.Razorpay(options);
    checkout.open();
  });
}

// Creates a Razorpay order on the server (price from CMS) and opens Checkout.
// The browser never sends an amount. Status is confirmed by signature verify + webhook.
export async function startCheckout(
  request: CheckoutRequest
): Promise<{ ok: boolean; error?: string }> {
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

    if (res.ok && data.success && (data.alreadyPaid || data.alreadyProcessing) && data.orderRef) {
      window.location.href = `/?order=${encodeURIComponent(data.orderRef)}`;
      return { ok: true };
    }

    if (res.ok && data.success && data.razorpayOrderId && data.keyId) {
      await loadRazorpayScript();
      return openRazorpayCheckout(data, token);
    }

    return {
      ok: false,
      error: data.error || 'Unable to start payment. Please try again.',
    };
  } catch {
    return { ok: false, error: 'Unable to reach the server. Please try again.' };
  }
}
