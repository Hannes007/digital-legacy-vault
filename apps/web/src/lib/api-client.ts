/**
 * Typed fetch client for the DLV API (docs/02-architecture/phase-2-contracts.md).
 *
 * - Base URL from NEXT_PUBLIC_API_URL, prefixed with /api/v1.
 * - RFC 9457 problem+json errors parsed into a typed ApiError.
 * - Automatic 401 → refresh → retry-once flow. The refresh call uses
 *   `credentials: "include"` so the httpOnly `dlv_rt` cookie travels; the
 *   rotated access token lives only in the in-memory token store.
 */
import type {
  AuthTokensDto,
  LoginRequest,
  LoginResultDto,
  ProblemDetails,
  RegisterRequest,
  SessionDto,
  TotpVerifyRequest,
  UserDto,
} from "@dlv/shared-types";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import { clearAuthCookie, setAuthCookie } from "./auth-cookie";
import { tokenStore } from "./token-store";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

export class ApiError extends Error {
  readonly problem: ProblemDetails;
  readonly status: number;

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.problem = problem;
    this.status = problem.status;
  }

  /** Per-field validation messages from `ProblemDetails.errors`. */
  get fieldErrors(): Record<string, string[]> {
    return this.problem.errors ?? {};
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Response of POST /auth/totp/setup. */
export interface TotpSetupResponse {
  otpauthUrl: string;
  secretMasked: string;
}

/** Response of POST /auth/totp/enable — recovery codes are returned exactly once. */
export interface TotpEnableResponse {
  recoveryCodes: string[];
}

/** Stored WebAuthn credential as listed by GET /auth/passkeys. */
export interface PasskeyDto {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Attach the bearer token and run the 401→refresh→retry flow. Default true. */
  auth?: boolean;
  credentials?: RequestCredentials;
}

async function parseProblem(res: Response): Promise<ProblemDetails> {
  try {
    const data = (await res.json()) as Partial<ProblemDetails>;
    return {
      type: data.type ?? "about:blank",
      title: data.title ?? (res.statusText || "Request failed"),
      status: data.status ?? res.status,
      ...(data.detail !== undefined ? { detail: data.detail } : {}),
      ...(data.instance !== undefined ? { instance: data.instance } : {}),
      ...(data.errors !== undefined ? { errors: data.errors } : {}),
    };
  } catch {
    return {
      type: "about:blank",
      title: res.statusText || "Request failed",
      status: res.status,
    };
  }
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Rotates the refresh token (single-flight: concurrent 401s share one call).
 * Returns true when a new access token was obtained.
 */
async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as AuthTokensDto;
      tokenStore.set(tokens.accessToken);
      setAuthCookie();
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, auth = true, credentials = "omit" } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError({
      type: "about:blank",
      title: "Network error",
      status: 0,
      detail: "We couldn't reach the server. Check your connection and try again.",
    });
  }

  if (res.status === 401 && auth && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    tokenStore.clear();
    clearAuthCookie();
  }

  if (!res.ok) {
    throw new ApiError(await parseProblem(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiClient = {
  // ---- registration & email verification ----
  register: (body: RegisterRequest) =>
    request<UserDto>("/auth/register", { method: "POST", body, auth: false }),
  verifyEmail: (token: string) =>
    request<void>("/auth/verify-email", { method: "POST", body: { token }, auth: false }),

  // ---- login / MFA / session ----
  login: (body: LoginRequest) =>
    request<LoginResultDto>("/auth/login", {
      method: "POST",
      body,
      auth: false,
      credentials: "include",
    }),
  verifyTotp: (body: TotpVerifyRequest) =>
    request<LoginResultDto>("/auth/mfa/totp/verify", {
      method: "POST",
      body,
      auth: false,
      credentials: "include",
    }),
  logout: () => request<void>("/auth/logout", { method: "POST", credentials: "include" }),
  me: () => request<UserDto>("/auth/me"),
  refresh: refreshAccessToken,

  // ---- passkeys (WebAuthn) ----
  passkeyRegistrationOptions: () =>
    request<PublicKeyCredentialCreationOptionsJSON>("/auth/passkeys/registration/options", {
      method: "POST",
    }),
  passkeyRegistrationVerify: (body: RegistrationResponseJSON) =>
    request<void>("/auth/passkeys/registration/verify", { method: "POST", body }),
  passkeyAuthenticationOptions: (mfaToken?: string) =>
    request<PublicKeyCredentialRequestOptionsJSON>("/auth/passkeys/authentication/options", {
      method: "POST",
      body: mfaToken ? { mfaToken } : {},
      auth: false,
    }),
  passkeyAuthenticationVerify: (body: AuthenticationResponseJSON) =>
    request<LoginResultDto>("/auth/passkeys/authentication/verify", {
      method: "POST",
      body,
      auth: false,
      credentials: "include",
    }),
  listPasskeys: () => request<PasskeyDto[]>("/auth/passkeys"),
  removePasskey: (id: string) =>
    request<void>(`/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ---- TOTP ----
  totpSetup: () => request<TotpSetupResponse>("/auth/totp/setup", { method: "POST" }),
  totpEnable: (code: string) =>
    request<TotpEnableResponse>("/auth/totp/enable", { method: "POST", body: { code } }),
  totpDisable: (password: string) =>
    request<void>("/auth/totp", { method: "DELETE", body: { password } }),

  // ---- sessions ----
  listSessions: () => request<SessionDto[]>("/users/me/sessions"),
  revokeSession: (id: string) =>
    request<void>(`/users/me/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export type ApiClient = typeof apiClient;
