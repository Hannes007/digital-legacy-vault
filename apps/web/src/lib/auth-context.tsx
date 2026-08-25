"use client";

/**
 * Client-side auth state. The access token itself stays in the in-memory
 * token store (src/lib/token-store.ts); this context holds the user profile
 * and the in-flight MFA challenge, and exposes the auth actions.
 */
import { startAuthentication } from "@simplewebauthn/browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LoginResultDto, UserDto } from "@dlv/shared-types";

import { apiClient } from "./api-client";
import { clearAuthCookie, hasAuthCookie, setAuthCookie } from "./auth-cookie";
import { tokenStore } from "./token-store";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface MfaChallenge {
  mfaToken: string;
  methods: Array<"TOTP" | "PASSKEY">;
  email: string;
}

export interface AuthContextValue {
  user: UserDto | null;
  status: AuthStatus;
  /** Present between a MFA_REQUIRED login result and MFA completion. */
  mfaChallenge: MfaChallenge | null;
  login(email: string, password: string): Promise<LoginResultDto>;
  /** Completes an MFA_REQUIRED login with a TOTP or recovery code. */
  completeTotp(code: string): Promise<void>;
  /** Full passkey sign-in, or MFA step-up when a challenge is active. */
  loginWithPasskey(): Promise<void>;
  logout(): Promise<void>;
  /** Re-fetches /auth/me (e.g. after enabling TOTP or adding a passkey). */
  refreshUser(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);

  const applyAuthenticated = useCallback((result: LoginResultDto): void => {
    if (result.status !== "AUTHENTICATED" || !result.tokens || !result.user) {
      throw new Error("Expected an authenticated login result");
    }
    tokenStore.set(result.tokens.accessToken);
    setAuthCookie();
    setUser(result.user);
    setMfaChallenge(null);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback((): void => {
    tokenStore.clear();
    clearAuthCookie();
    setUser(null);
    setMfaChallenge(null);
    setStatus("unauthenticated");
  }, []);

  // Bootstrap: if the lightweight auth flag is present, silently exchange the
  // httpOnly refresh cookie for an access token and load the profile.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap(): Promise<void> {
      if (!hasAuthCookie()) {
        setStatus("unauthenticated");
        return;
      }
      const refreshed = await apiClient.refresh();
      if (cancelled) return;
      if (!refreshed) {
        clearSession();
        return;
      }
      try {
        const me = await apiClient.me();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) clearSession();
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResultDto> => {
      const result = await apiClient.login({ email, password });
      if (result.status === "MFA_REQUIRED" && result.mfaToken) {
        setMfaChallenge({
          mfaToken: result.mfaToken,
          methods: result.methods ?? ["TOTP"],
          email,
        });
      } else {
        applyAuthenticated(result);
      }
      return result;
    },
    [applyAuthenticated],
  );

  const completeTotp = useCallback(
    async (code: string): Promise<void> => {
      if (!mfaChallenge) {
        throw new Error("No sign-in is in progress");
      }
      const result = await apiClient.verifyTotp({ mfaToken: mfaChallenge.mfaToken, code });
      applyAuthenticated(result);
    },
    [mfaChallenge, applyAuthenticated],
  );

  const loginWithPasskey = useCallback(async (): Promise<void> => {
    const options = await apiClient.passkeyAuthenticationOptions(mfaChallenge?.mfaToken);
    const assertion = await startAuthentication({ optionsJSON: options });
    const result = await apiClient.passkeyAuthenticationVerify(assertion);
    applyAuthenticated(result);
  }, [mfaChallenge, applyAuthenticated]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch {
      // The server session may already be gone; clear the client regardless.
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async (): Promise<void> => {
    const me = await apiClient.me();
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      mfaChallenge,
      login,
      completeTotp,
      loginWithPasskey,
      logout,
      refreshUser,
    }),
    [user, status, mfaChallenge, login, completeTotp, loginWithPasskey, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
