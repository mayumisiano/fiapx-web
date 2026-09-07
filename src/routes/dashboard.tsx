import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  authApi,
  statusLabel,
  videoApi,
  type JobStatus,
  type AuthUser,
  type VideoJob,
} from "@/lib/api-client";
import { FiapLogo } from "@/components/fiap-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard | FIAP X - Video Processor" },
      {
        name: "description",
        content:
          "Upload multiple videos, track the status of each request and download the results as ZIP.",
      },
      { property: "og:title", content: "Dashboard | FIAP X" },
      {
        property: "og:description",
        content: "Upload videos and track processing status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const ACCEPT = ".mp4,.avi,.mov,.mkv,.wmv,.flv,.webm";

const statusStyles: Record<JobStatus, string> = {
  PENDING: "border-border text-muted-foreground",
  PROCESSING: "border-primary/60 text-primary",
  COMPLETED: "border-foreground/40 text-foreground",
  FAILED: "border-destructive/60 text-destructive",
};

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`fiap-eyebrow inline-flex border px-2.5 py-1 hairline ${statusStyles[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await videoApi.listJobs();
    setJobs(list);
  }, []);

  useEffect(() => {
    const current = authApi.getCurrentUser();
    if (!current) {
      navigate({ to: "/" });
      return;
    }
    setUser(current);
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [navigate, refresh]);

  async function handleUpload() {
    if (files.length === 0) {
      setError("Select at least one video.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      await videoApi.uploadVideos(files);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading videos.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(job: VideoJob) {
    const url = await videoApi.getDownloadUrl(job.id);
    window.open(url, "_blank");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="hairline border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <FiapLogo />
          <div className="flex items-center gap-5">
            <span className="fiap-eyebrow text-muted-foreground">{user.name}</span>
            <Button
              variant="outline"
              size="sm"
              className="fiap-eyebrow hairline border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => {
                authApi.logout();
                navigate({ to: "/" });
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="hairline border-b border-border bg-primary">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2.5">
          <span className="fiap-eyebrow text-primary-foreground">Video Processor</span>
          <span className="text-primary-foreground">■</span>
          <span className="fiap-eyebrow text-primary-foreground">
            Frames extracted and delivered as ZIP
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="hairline border border-primary/50 p-6">
          <p className="fiap-eyebrow text-primary">Step 01</p>
          <h2 className="fiap-heading mt-2 text-xl text-foreground">Upload videos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Supported formats: MP4, AVI, MOV, MKV, WMV, FLV, WEBM.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hairline h-11 max-w-md border-border bg-secondary/40"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="fiap-eyebrow h-11"
            >
              {uploading ? "Uploading..." : "Process videos →"}
            </Button>
          </div>
          {files.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {files.length} file(s) selected
            </p>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>

        <section className="hairline border border-border p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="fiap-eyebrow text-primary">Step 02</p>
              <h2 className="fiap-heading mt-2 text-xl text-foreground">My requests</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="fiap-eyebrow hairline border-border"
              onClick={refresh}
            >
              Refresh
            </Button>
          </div>

          {jobs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No videos uploaded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hairline border-border hover:bg-transparent">
                  <TableHead className="fiap-eyebrow text-muted-foreground">
                    File name
                  </TableHead>
                  <TableHead className="fiap-eyebrow text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="fiap-eyebrow text-muted-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="hairline border-border">
                    <TableCell className="font-medium">{job.fileName}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      {job.status === "COMPLETED" && (
                        <button
                          className="fiap-eyebrow text-primary hover:underline"
                          onClick={() => handleDownload(job)}
                        >
                          Download ZIP →
                        </button>
                      )}
                      {job.status === "FAILED" && (
                        <span className="text-sm text-destructive">
                          {job.errorMessage ?? "Processing error."}
                        </span>
                      )}
                      {(job.status === "PENDING" || job.status === "PROCESSING") && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>

      <footer className="hairline border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-5 fiap-eyebrow text-muted-foreground">
          FIAP X <span className="text-primary">■</span> Video Processing Platform
        </p>
      </footer>
    </div>
  );
}
