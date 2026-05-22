"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from "react";
import axios, { type AxiosError } from "axios";
import {
  apiGet,
  apiPost,
  setTokens,
  clearTokens,
  getAccessToken,
} from "./api";
import type { ApiUser } from "./types";

type AuthCtx = {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => { throw new Error("AuthContext not mounted"); },
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      if (!getAccessToken()) {
        setUser(null);
        return;
      }
      const res = await apiGet<{ user: ApiUser }>("/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiPost<{ accessToken: string; refreshToken: string; user: ApiUser }>(
        "/auth/login",
        { email, password },
      );
      if (res.user.role !== "admin") {
        // Surface as a 403 so the login page can show the right message.
        throw Object.assign(new Error("This account is not an admin."), { status: 403 });
      }
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setUser(res.user);
      return res.user;
    } catch (err) {
      // If we already enriched the error (e.g. not-admin), re-throw as-is.
      if ((err as Error & { status?: number }).status !== undefined && !(err as AxiosError).isAxiosError) {
        throw err;
      }
      // Extract HTTP status + API-provided message from AxiosError.
      const axiosErr = axios.isAxiosError(err) ? err as AxiosError<{ error?: string; message?: string }> : null;
      const status = axiosErr?.response?.status;
      const apiMsg = axiosErr?.response?.data?.error || axiosErr?.response?.data?.message;
      const msg = apiMsg || (err as Error).message || "Login failed";
      throw Object.assign(new Error(msg), { status });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
