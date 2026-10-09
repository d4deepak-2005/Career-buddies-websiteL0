import { clearPublicCache } from './publicCache';
const TOKEN_KEY = 'cb_admin_token';
const EXPIRES_KEY = 'cb_admin_token_expires';
const NAME_KEY = 'cb_admin_name';
const SOURCE_KEY = 'cb_admin_source';
const SIDEBAR_KEY = 'cb_admin_sidebar_collapsed';
const THEME_KEY = 'cb_admin_theme';

export type AdminTheme = 'light' | 'dark';

export type AdminProfile = { name: string; source: 'owner' | 'team' };

export function getAdminToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));

  if (!token || !expiresAt || Date.now() > expiresAt) {
    return null;
  }

  return token;
}

export function setAdminToken(token: string, expiresAt: number, profile?: Partial<AdminProfile>): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRES_KEY, String(expiresAt));
  if (profile?.name) localStorage.setItem(NAME_KEY, profile.name);
  if (profile?.source) localStorage.setItem(SOURCE_KEY, profile.source);
}

export function getAdminProfile(): AdminProfile {
  try {
    const name = localStorage.getItem(NAME_KEY) || 'Owner';
    const source = localStorage.getItem(SOURCE_KEY) === 'team' ? 'team' : 'owner';
    return { name, source };
  } catch {
    return { name: 'Owner', source: 'owner' };
  }
}

export function setAdminProfile(profile: AdminProfile): void {
  localStorage.setItem(NAME_KEY, profile.name);
  localStorage.setItem(SOURCE_KEY, profile.source);
}

export function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getAdminTheme(): AdminTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function setAdminTheme(theme: AdminTheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(SOURCE_KEY);
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

  // Any successful change made by an admin may alter public content: drop the shared public cache.
  const method = (init.method || 'GET').toUpperCase();
  if (response.ok && method !== 'GET' && method !== 'HEAD') clearPublicCache();

  return response;
}
