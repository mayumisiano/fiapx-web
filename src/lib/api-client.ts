// Real API client against the fiapx-video-processor backend (/api/v1).
// Two services, two base URLs, no gateway yet (see fiapx-video-processor's
// docs/adr/0007): identity-api issues/owns auth, video-api owns everything
// else. They're split on purpose (own database each) — not a detail to
// paper over by pointing both at the same host.

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// Mirrors the backend's FailureReason enum (video-processor's
// internal/videoprocessing/domain/processing_request.go) so the UI never
// has to parse or guess at free-text error strings.
export type FailureReason =
  "INVALID_FORMAT" | "SIZE_EXCEEDED" | "CORRUPTED_FILE" | "INTERNAL_ERROR";

export const failureMessages: Record<FailureReason, string> = {
  INVALID_FORMAT: "Unsupported video format. Accepted formats: mp4, mov, mkv, webm.",
  SIZE_EXCEEDED: "Video exceeds the maximum allowed size (500 MB) or duration (30 minutes).",
  CORRUPTED_FILE: "Could not read the video file. It may be corrupted.",
  INTERNAL_ERROR: "An internal error occurred while processing your video.",
};

export interface VideoJob {
  id: string;
  fileName: string;
  status: JobStatus;
  downloadUrl?: string | undefined;
  failureReason?: FailureReason | undefined;
  attempts: number;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const TOKEN_KEY = "fiapx.token";
const USER_KEY = "fiapx.user";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8080/api/v1";
const IDENTITY_API_URL = import.meta.env["VITE_IDENTITY_API_URL"] ?? "http://localhost:8081/api/v1";

export const MAX_ATTEMPTS = 3;

interface ApiErrorBody {
  error?: { code: string; message: string };
}

class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request(
  path: string,
  init: RequestInit = {},
  baseUrl: string = API_URL,
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });

  if (res.status === 401) {
    authApi.logout();
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = await res.json();
    } catch {
      // response had no JSON body
    }
    throw new ApiError(
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? `Request failed with status ${res.status}`,
    );
  }

  return res;
}

async function requestJSON<T>(
  path: string,
  init: RequestInit = {},
  baseUrl: string = API_URL,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const res = await request(path, { ...init, headers }, baseUrl);
  return res.json() as Promise<T>;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

function storeSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const auth = await requestJSON<AuthResponse>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      IDENTITY_API_URL,
    );
    storeSession(auth);
    return auth.user;
  },

  async register(name: string, email: string, password: string): Promise<AuthUser> {
    const auth = await requestJSON<AuthResponse>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ name, email, password }) },
      IDENTITY_API_URL,
    );
    storeSession(auth);
    return auth.user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
};

interface RequestSummary {
  id: string;
  fileName: string;
  status: JobStatus;
  failureReason?: FailureReason | "";
  attempts: number;
  frameCount?: number;
  createdAt: string;
  updatedAt?: string;
}

function toJob(summary: RequestSummary): VideoJob {
  return {
    id: summary.id,
    fileName: summary.fileName,
    status: summary.status,
    failureReason: summary.failureReason || undefined,
    attempts: summary.attempts,
    createdAt: summary.createdAt,
  };
}

interface UploadResultItem {
  fileName: string;
  accepted: boolean;
  request?: RequestSummary;
  error?: { code: string; message: string };
}

export const videoApi = {
  async uploadVideos(files: File[]): Promise<VideoJob[]> {
    const form = new FormData();
    files.forEach((f) => form.append("videos", f));

    const res = await request("/videos", { method: "POST", body: form });
    const { results } = (await res.json()) as { results: UploadResultItem[] };

    const accepted = results.filter((r) => r.accepted && r.request);
    const rejected = results.filter((r) => !r.accepted);

    if (rejected.length > 0) {
      const detail = rejected.map((r) => `${r.fileName}: ${r.error?.message}`).join(" ");
      throw new Error(detail);
    }

    return accepted.map((r) => toJob(r.request!));
  },

  async listJobs(): Promise<VideoJob[]> {
    const { requests } = await requestJSON<{ requests: RequestSummary[] }>("/videos");
    return requests.map(toJob);
  },

  async getDownloadUrl(id: string): Promise<string> {
    const { downloadUrl } = await requestJSON<{ downloadUrl: string; expiresIn: number }>(
      `/videos/${id}/download`,
    );
    return downloadUrl;
  },

  async retryVideo(id: string): Promise<VideoJob> {
    const { request: summary } = await requestJSON<{ request: RequestSummary }>(
      `/videos/${id}/retry`,
      { method: "POST" },
    );
    return toJob(summary);
  },
};

export const statusLabel: Record<JobStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};
