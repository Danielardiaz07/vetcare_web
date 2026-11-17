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
import { getMe, login, logout, restoreSession } from "@/services/auth";
import type { SessionUser, UserProfile } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthState = {
  user: SessionUser | null;
  profile: UserProfile | null;
  status: AuthStatus;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
};

const ANONYMOUS: AuthState = { user: null, profile: null, status: "anonymous" };

const AuthContext = createContext<AuthContextValue | null>(null);

// Sin el perfil la sesión sigue siendo válida; el portal muestra el correo en lugar del nombre.
const loadProfile = () => getMe().catch(() => null);

async function loadSession(): Promise<AuthState> {
  const user = await restoreSession();
  if (!user) return ANONYMOUS;
  return { user, profile: await loadProfile(), status: "authenticated" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...ANONYMOUS, status: "loading" });

  useEffect(() => {
    let active = true;
    void loadSession().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await login({ email, password });
    setState({ user, profile: await loadProfile(), status: "authenticated" });
    return user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setState(ANONYMOUS);
    }
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
