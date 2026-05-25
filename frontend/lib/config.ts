/**
 * Central config — reads from environment variables.
 * Set NEXT_PUBLIC_API_URL in .env.local for local dev,
 * or in Vercel environment settings for production.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ??
  API_BASE.replace(/^http/, "ws");

/** Simple fetch wrapper — no auth headers needed in demo mode */
export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${API_BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
