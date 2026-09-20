// Sends a lead to the server and reports the TRUE outcome. Success is only reported
// when the server confirms the lead was stored (HTTP 2xx + success:true); every other
// outcome (validation error, rate limit, server error, network failure) returns a
// user-facing message so forms never show a false "submitted" state.
export interface SubmitLeadResult {
  ok: boolean;
  error?: string;
}

const GENERIC_ERROR = 'We could not send your details right now. Please try again in a moment.';

export async function submitLead(payload: Record<string, unknown>): Promise<SubmitLeadResult> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON body (e.g. a proxy error page)
    }

    if (res.ok && data && data.success === true) return { ok: true };

    if (res.status === 429) {
      return { ok: false, error: (data && data.error) || 'Too many submissions. Please wait a few minutes and try again.' };
    }

    // Validation messages come from the server and are safe to show.
    if (res.status === 400 && data && typeof data.error === 'string') {
      return { ok: false, error: data.error };
    }

    return { ok: false, error: GENERIC_ERROR };
  } catch {
    return { ok: false, error: 'Unable to reach the server. Please check your connection and try again.' };
  }
}
