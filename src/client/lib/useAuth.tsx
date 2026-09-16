import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthMode, AuthSource, AuthStatusResponse, AuthLoginResponse } from "../../shared/rpcTypes";
import { api, clearAuthToken, getAuthToken, setAuthToken } from "./api";

const SKIP_SETUP_KEY = "tg_auth_skip_setup";

interface AuthContextValue {
  mode: AuthMode;
  source: AuthSource;
  authenticated: boolean;
  loading: boolean;
  skippedSetup: boolean;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  setup: (password: string) => Promise<{ ok: boolean; error?: string }>;
  skipSetup: () => void;
  logout: () => void;
  removePassword: () => Promise<{ ok: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("open");
  const [source, setSource] = useState<AuthSource>("none");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skippedSetup, setSkippedSetup] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SKIP_SETUP_KEY) === "true";
    } catch {
      return false;
    }
  });

  const checkStatus = async () => {
    try {
      const res = await api.get<AuthStatusResponse>("/api/auth/status");
      if (res.ok) {
        setMode(res.data.mode);
        setSource(res.data.source);
        setAuthenticated(res.data.authenticated);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    function onUnauthorized() {
      setAuthenticated(false);
    }

    window.addEventListener("tg_auth_unauthorized", onUnauthorized);
    return () => window.removeEventListener("tg_auth_unauthorized", onUnauthorized);
  }, []);

  const login = async (password: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await api.post<AuthLoginResponse>("/api/auth/login", { password });
    if (res.ok) {
      setAuthToken(res.data.token);
      setAuthenticated(true);
      await checkStatus();
      return { ok: true };
    }
    return { ok: false, error: res.description || "Invalid password" };
  };

  const setup = async (password: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await api.post<AuthLoginResponse>("/api/auth/setup", { password });
    if (res.ok) {
      setAuthToken(res.data.token);
      setAuthenticated(true);
      await checkStatus();
      return { ok: true };
    }
    return { ok: false, error: res.description || "Failed to set password" };
  };

  const skipSetup = () => {
    try {
      localStorage.setItem(SKIP_SETUP_KEY, "true");
    } catch {
      // ignore
    }
    setSkippedSetup(true);
  };

  const logout = () => {
    clearAuthToken();
    setAuthenticated(false);
    checkStatus();
  };

  const removePassword = async (): Promise<{ ok: boolean; error?: string }> => {
    const res = await api.post<{ status: string }>("/api/auth/remove");
    if (res.ok) {
      clearAuthToken();
      await checkStatus();
      return { ok: true };
    }
    return { ok: false, error: res.description || "Failed to remove password" };
  };

  return (
    <AuthContext.Provider
      value={{
        mode,
        source,
        authenticated,
        loading,
        skippedSetup,
        login,
        setup,
        skipSetup,
        logout,
        removePassword,
        refreshStatus: checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
