const TOKEN_KEY = 'cb_candidate_token';
const EXPIRES_KEY = 'cb_candidate_token_expires';

export interface CandidateProfile {
  id: string;
  email: string;
  accountType: 'mentee' | 'mentor';
  firstName: string;
  lastName: string;
  mobile: string;
  alternateNumber: string;
  alternateEmail: string;
  currentDesignation: string;
  totalExperience: string;
  targetRole: string;
  linkedinUrl: string;
  portfolioUrl: string;
  bio: string;
  joinedAt: string;
  // false for accounts that only sign in with Google / LinkedIn / Microsoft / Facebook
  hasPassword?: boolean;
}

export function getCandidateToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));
    if (!token || !expiresAt || Date.now() > expiresAt) return null;
    return token;
  } catch {
    return null;
  }
}

export function setCandidateToken(token: string, expiresAt: number): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRES_KEY, String(expiresAt));
  } catch {
    // storage unavailable — session lasts until the page is closed
  }
}

export function clearCandidateToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  } catch {
    // ignore
  }
}

// fetch() wrapper for candidate-only APIs. Sends the session token; the server
// decides who the user is from it (no user id is ever sent from the browser).
export async function candidateFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getCandidateToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}
