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
import {
  apiGet,
  apiPost,
  apiError,
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
        throw new Error("This account is not an admin.");
      }
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setUser(res.user);
      return res.user;
    } catch (err) {
      throw new Error((err as Error).message || apiError(err, "Login failed"));
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
