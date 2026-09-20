export interface CheckoutRequest {
  itemType: 'webinar' | 'plan' | 'programme';
  itemId?: string;
  itemName?: string;
  customer: { name: string; email: string; mobile?: string };
  details?: Record<string, unknown>;
}

// Asks the server to create a Dodo Payments checkout session and, on success,
// redirects the browser to Dodo's hosted checkout page. The price is defined
// by the Dodo product on the server; no amount or secret is sent from here.
export async function startCheckout(
  request: CheckoutRequest
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = await res.json();

    if (res.ok && data.success && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
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
