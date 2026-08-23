import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import queryString from "query-string";

import type {
  IBlobResponse,
  IDelete,
  IGet,
  IPatch,
  IPost,
  IPostMultipart,
  IPut,
  QueryParams,
  RequestError,
} from "@/interfaces/IAxios";
import type { SessionTokens } from "@/interfaces/auth";
import { useAuthStore } from "@/store/auth.store";

/**
 * The single place the app talks to the network.
 *
 * The browser only ever calls same-origin `/api/...`; `next.config.ts` rewrites
 * that to `NEXT_PUBLIC_BASE_URL`, so the backend is swappable per environment
 * with no code change and there is no CORS surface.
 */
const API_PREFIX = "/api/";

/**
 * A 401 is the only signal there is.
 *
 * The API answers every credential failure — unknown token, replayed, revoked,
 * expired, suspended user — with an identical `401 { status, code, message }`,
 * on purpose: a distinguishable "REUSE_DETECTED" would tell an attacker their
 * stolen token was the one that tripped the alarm. So the client cannot tell
 * "expired, refresh it" from "revoked, give up" by reading the body, and does
 * not try. It attempts exactly one refresh; if that also 401s, the session is
 * over. A 403 is an authorisation answer about a valid session and never
 * triggers a refresh.
 */
const UNAUTHORIZED = 401;

/**
 * Endpoints that must never trigger a refresh-or-logout cycle themselves.
 *
 * Everything unauthenticated is here as well as the obvious loops: a 401 from
 * `POST /auth/login` is a wrong password, and bouncing the visitor to the
 * logout screen for mistyping one would be absurd.
 */
const AUTH_BYPASS_PATHS = [
  "auth/refresh",
  "auth/login",
  "auth/logout",
  "auth/register",
  "auth/verify-otp",
  "auth/mfa/verify",
  "auth/password/forgot",
  "auth/password/reset",
  "auth/social/",
  "auth/staff/",
];

const REFRESH_ENDPOINT = "auth/refresh";
const LOGOUT_URL = "/auth/logout?code=session_ended";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function serializeQuery(query?: QueryParams): string {
  if (!query) return "";

  const serialized = queryString.stringify(query, {
    arrayFormat: "comma",
    skipNull: true,
    skipEmptyString: true,
  });

  return serialized ? `?${serialized}` : "";
}

function withQuery(url: string, query?: QueryParams): string {
  return `${url}${serializeQuery(query)}`;
}

function isBypassed(url?: string): boolean {
  if (!url) return false;
  return AUTH_BYPASS_PATHS.some((path) => url.includes(path));
}

function forceLogout(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth/logout")) return;
  window.location.href = LOGOUT_URL;
}

/** Filename from `content-disposition`, tolerating the RFC 5987 `filename*` form. */
function parseFilename(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim());

  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  if (plain?.[1]) return plain[1].trim();

  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Single-flight token refresh                                                */
/* -------------------------------------------------------------------------- */

interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (reason: unknown) => void;
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: QueuedRequest[] = [];

/** Bare instance: no interceptors, so refreshing can never recurse. */
const refreshClient = axios.create({
  baseURL: API_PREFIX,
  headers: { "Content-Type": "application/json" },
});

function flushQueue(error: unknown, token: string | null): void {
  const queue = failedQueue;
  failedQueue = [];

  queue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
}

async function performRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  // Sent in the body, not relied on as a cookie: the API's refresh cookie is
  // scoped to `/v1/auth` on the API's own origin, and this app calls a
  // same-origin `/api` proxy, so the browser would never attach it.
  const response = await refreshClient.post<{ data: SessionTokens }>(REFRESH_ENDPOINT, {
    refreshToken,
  });
  const tokens = response.data?.data;

  if (!tokens?.accessToken) {
    throw new Error("Refresh response did not contain an access token.");
  }

  // The API rotates the refresh token on every use and treats a replay as theft,
  // so the new one must be stored, not just the access token.
  useAuthStore.getState().setTokens(tokens);

  return tokens.accessToken;
}

/**
 * N concurrent 401s produce exactly one `POST /auth/refresh-tokens`; every other
 * caller waits on the queue and replays with the new token.
 */
function requestFreshToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  refreshPromise = performRefresh()
    .then((token) => {
      // Flags are cleared in the same microtask as the flush. Clearing them
      // later (e.g. in a `.finally`) leaves a window where a fresh 401 would
      // enqueue onto an already-drained queue and hang forever.
      isRefreshing = false;
      refreshPromise = null;
      flushQueue(null, token);
      return token;
    })
    .catch((error: unknown) => {
      isRefreshing = false;
      refreshPromise = null;
      flushQueue(error, null);
      throw error;
    });

  return refreshPromise;
}

/* -------------------------------------------------------------------------- */
/* Interceptors                                                               */
/* -------------------------------------------------------------------------- */

function attachAuthorization(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (typeof window === "undefined") return config;
  if (config.headers?.Authorization) return config;

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

/**
 * One implementation, attached to both instances. Always rejects — including
 * when `error.response` is undefined, so a network failure never resolves to
 * `undefined` and silently looks like an empty success.
 */
async function handleResponseError(error: AxiosError<RequestError>): Promise<AxiosResponse> {
  const originalRequest = error.config as RetriableRequestConfig | undefined;
  const envelope = error.response?.data;

  if (
    error.response?.status === UNAUTHORIZED &&
    originalRequest &&
    !originalRequest._retry &&
    !isBypassed(originalRequest.url)
  ) {
    originalRequest._retry = true;

    try {
      const token = await requestFreshToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return await axios.request(originalRequest);
    } catch (refreshError) {
      // One attempt, then the session is over. The API gives no way to tell an
      // expired token from a revoked one, so a second try would only be a guess.
      forceLogout();
      return Promise.reject(envelope ?? refreshError);
    }
  }

  return Promise.reject(envelope ?? error);
}

/* -------------------------------------------------------------------------- */
/* Facade                                                                     */
/* -------------------------------------------------------------------------- */

class HttpFacade {
  private readonly http: AxiosInstance;
  private readonly httpMultipart: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: API_PREFIX,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });

    this.httpMultipart = axios.create({
      baseURL: API_PREFIX,
      headers: { "Content-Type": "multipart/form-data" },
    });

    [this.http, this.httpMultipart].forEach((instance) => {
      instance.interceptors.request.use(attachAuthorization);
      instance.interceptors.response.use((response) => response, handleResponseError);
    });
  }

  async get<T>({ url, query, headers }: IGet): Promise<T> {
    const response = await this.http.get<T>(withQuery(url, query), { headers });
    return response.data;
  }

  async getBlob({ url, query, headers }: IGet): Promise<IBlobResponse> {
    const response = await this.http.get<Blob>(withQuery(url, query), {
      headers,
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename: parseFilename(
        response.headers["content-disposition"] as string | undefined,
        "download",
      ),
      contentType:
        (response.headers["content-type"] as string | undefined) ?? "application/octet-stream",
    };
  }

  async post<T>({ url, body, query, headers }: IPost): Promise<T> {
    const response = await this.http.post<T>(withQuery(url, query), body, { headers });
    return response.data;
  }

  /** Same as `post`, but hands back the whole response (for headers/status). */
  async postEntire<T>({ url, body, query, headers }: IPost): Promise<AxiosResponse<T>> {
    return this.http.post<T>(withQuery(url, query), body, { headers });
  }

  async patch<T>({ url, body, query, headers }: IPatch): Promise<T> {
    const response = await this.http.patch<T>(withQuery(url, query), body, { headers });
    return response.data;
  }

  async put<T>({ url, body, query, headers }: IPut): Promise<T> {
    const response = await this.http.put<T>(withQuery(url, query), body, { headers });
    return response.data;
  }

  async delete<T>({ url, body, headers }: IDelete): Promise<T> {
    const response = await this.http.delete<T>(url, { data: body, headers });
    return response.data;
  }

  async upload<T>({ url, data, query, headers }: IPostMultipart): Promise<T> {
    const response = await this.httpMultipart.post<T>(withQuery(url, query), data, { headers });
    return response.data;
  }
}

/** The only HTTP client in the app. Import it from `services/*.services.ts` only. */
const http = new HttpFacade();

export default http;
