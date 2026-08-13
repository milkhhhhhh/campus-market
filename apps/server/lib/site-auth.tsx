"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  AUTH,
  type AuthTokenResult,
  type UserDTO,
} from "@campus/shared";

import {
  getStoredToken,
  setStoredToken,
  siteRequest,
  SiteApiError,
} from "@/lib/site-api";

interface SiteAuthValue {
  token: string | null;
  user: UserDTO | null;
  ready: boolean;
  isDev: boolean;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    nickname?: string,
  ) => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  requireLogin: (next?: string) => boolean;
}

const SiteAuthContext = createContext<SiteAuthValue | null>(null);

export function SiteAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDTO | null>(null);
  const [ready, setReady] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  const applyAuth = useCallback((result: AuthTokenResult) => {
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const refreshProfile = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setToken(null);
      setUser(null);
      return;
    }
    try {
      const profile = await siteRequest<UserDTO>(AUTH.profile);
      setToken(t);
      setUser(profile);
    } catch (error) {
      if (error instanceof SiteApiError && error.statusCode === 401) {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    void refreshProfile().finally(() => setReady(true));
  }, [refreshProfile]);

  const loginWithPassword = useCallback(
    async (username: string, password: string) => {
      const result = await siteRequest<AuthTokenResult>(AUTH.login, {
        method: "POST",
        data: { username, password },
        auth: false,
      });
      applyAuth(result);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (username: string, password: string, nickname?: string) => {
      const result = await siteRequest<AuthTokenResult>(AUTH.register, {
        method: "POST",
        data: { username, password, nickname },
        auth: false,
      });
      applyAuth(result);
    },
    [applyAuth],
  );

  const devLogin = useCallback(async () => {
    const result = await siteRequest<AuthTokenResult>(AUTH.devLogin, {
      method: "POST",
      data: { username: "web-demo-user" },
      auth: false,
    });
    applyAuth(result);
  }, [applyAuth]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const requireLogin = useCallback(
    (next?: string) => {
      if (token && user) return true;
      const q = next ? `?next=${encodeURIComponent(next)}` : "";
      router.push(`/login${q}`);
      return false;
    },
    [router, token, user],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      isDev,
      loginWithPassword,
      register,
      devLogin,
      logout,
      refreshProfile,
      requireLogin,
    }),
    [
      token,
      user,
      ready,
      isDev,
      loginWithPassword,
      register,
      devLogin,
      logout,
      refreshProfile,
      requireLogin,
    ],
  );

  return (
    <SiteAuthContext.Provider value={value}>{children}</SiteAuthContext.Provider>
  );
}

export function useSiteAuth(): SiteAuthValue {
  const ctx = useContext(SiteAuthContext);
  if (!ctx) throw new Error("useSiteAuth must be used within SiteAuthProvider");
  return ctx;
}
