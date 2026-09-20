const TOKEN_KEY = 'cb_admin_token';
const EXPIRES_KEY = 'cb_admin_token_expires';

export function getAdminToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));

  if (!token || !expiresAt || Date.now() > expiresAt) {
    return null;
  }

  return token;
}

export function setAdminToken(token: string, expiresAt: number): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRES_KEY, String(expiresAt));
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

export function isAdminAuthenticated(): boolean {
  return getAdminToken() !== null;
}

// fetch() wrapper for admin-only APIs: attaches the session token and, on a
// 401 (missing/expired token), clears it and reloads so the login gate reappears.
export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getAdminToken();

  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    clearAdminToken();
    window.location.reload();
  }

  return response;
}
