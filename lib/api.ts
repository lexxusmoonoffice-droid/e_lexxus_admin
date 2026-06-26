/**
 * Admin axios client — same architecture as the customer storefront:
 *   - Attaches bearer from localStorage.
 *   - On 401, single-flight refresh + replay; else bounce to /login.
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

// Normalise the URL: strip trailing slash, then append /api if not already present.
// This guards against Vercel env vars set without the /api suffix.
const _rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api").replace(/\/+$/, "");
export const API_URL = _rawApiUrl.endsWith("/api") ? _rawApiUrl : `${_rawApiUrl}/api`;

const ACCESS_KEY = "lexxus-admin-access";
const REFRESH_KEY = "lexxus-admin-refresh";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function setTokens({
  accessToken,
  refreshToken,
}: { accessToken?: string; refreshToken?: string }) {
  if (!isBrowser()) return;
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const t = getAccessToken();
  if (t) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${t}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (!isBrowser()) return null;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { withCredentials: true },
    );
    setTokens({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    });
    return res.data.accessToken as string;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || "";
    const skipRetry = !original || original._retry || url.includes("/auth/refresh") || url.includes("/auth/login");

    if (status === 401 && !skipRetry) {
      original!._retry = true;
      refreshing = refreshing || refreshAccess();
      const next = await refreshing;
      refreshing = null;
      if (next) {
        original!.headers = original!.headers || {};
        (original!.headers as Record<string, string>).Authorization = `Bearer ${next}`;
        return api.request(original!);
      }
      if (isBrowser() && !window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<T>(path, { params });
  return res.data;
}

export async function apiPost<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<T>(path, body, config);
  return res.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.put<T>(path, body);
  return res.data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.patch<T>(path, body);
  return res.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await api.delete<T>(path);
  return res.data;
}

export function apiError(err: unknown, fallback = "Something went wrong"): string {
  const e = err as AxiosError<{ error?: string; message?: string }>;
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

/**
 * Rewrite localhost proxy image URLs to the current backend API URL.
 * Products uploaded when PUBLIC_API_URL was set to localhost on the
 * production backend have thumbnails saved as http://localhost:5050/api/…
 * which browsers on the live domain cannot reach.
 */
export function fixImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    return API_URL.replace(/\/api$/, '') + path;
  }
  return url;
}
