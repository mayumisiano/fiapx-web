// API client (mocked). Replace with real HTTP calls later.

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface VideoJob {
  id: string;
  fileName: string;
  status: JobStatus;
  downloadUrl?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const TOKEN_KEY = "fiapx.token";
const USER_KEY = "fiapx.user";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let jobs: VideoJob[] = [
  {
    id: "seed-1",
    fileName: "intro-lesson.mp4",
    status: "COMPLETED",
    downloadUrl: "#",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    fileName: "final-interview.mov",
    status: "PROCESSING",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-3",
    fileName: "corrupted.avi",
    status: "FAILED",
    errorMessage: "Invalid video format or corrupted file.",
    createdAt: new Date().toISOString(),
  },
];

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    await delay(500);
    if (!email.includes("@") || password.length < 4) {
      throw new Error("Invalid email or password.");
    }
    const user: AuthUser = { id: "u1", name: email.split("@")[0] ?? email, email };
    localStorage.setItem(TOKEN_KEY, "mock-token-" + Date.now());
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  async register(name: string, email: string, password: string): Promise<AuthUser> {
    await delay(500);
    if (!name.trim()) throw new Error("Please enter your name.");
    if (!email.includes("@")) throw new Error("Invalid email.");
    if (password.length < 4) throw new Error("Password must be at least 4 characters.");
    const user: AuthUser = { id: "u1", name, email };
    localStorage.setItem(TOKEN_KEY, "mock-token-" + Date.now());
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
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

export const videoApi = {
  async uploadVideos(files: File[]): Promise<VideoJob[]> {
    await delay(600);
    const created: VideoJob[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      fileName: f.name,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    }));
    jobs = [...created, ...jobs];
    created.forEach((job, i) => {
      setTimeout(() => advance(job.id, "PROCESSING"), 2500 + i * 500);
      setTimeout(() => {
        const fail = Math.random() < 0.2;
        advance(
          job.id,
          fail ? "FAILED" : "COMPLETED",
          fail ? "Failed to process the video. Please try again." : undefined,
        );
      }, 8000 + i * 800);
    });
    return created;
  },

  async listJobs(): Promise<VideoJob[]> {
    await delay(300);
    return jobs.map((j) => ({ ...j }));
  },

  async getDownloadUrl(id: string): Promise<string> {
    await delay(200);
    const job = jobs.find((j) => j.id === id);
    if (!job || job.status !== "COMPLETED") throw new Error("File unavailable.");
    return job.downloadUrl ?? "#";
  },
};

function advance(id: string, status: JobStatus, errorMessage?: string) {
  jobs = jobs.map((j) =>
    j.id === id
      ? {
          ...j,
          status,
          errorMessage,
          downloadUrl: status === "COMPLETED" ? "#" : undefined,
        }
      : j,
  );
}

export const statusLabel: Record<JobStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};
