import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api-client";
import { FiapLogo } from "@/components/fiap-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | FIAP X - Video Processor" },
      {
        name: "description",
        content:
          "Sign in to FIAP X to upload videos, track processing status and download results as ZIP.",
      },
      { property: "og:title", content: "Sign in | FIAP X - Video Processor" },
      {
        property: "og:description",
        content: "Sign in to FIAP X to upload and process your videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (authApi.getCurrentUser()) navigate({ to: "/dashboard" });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await authApi.login(email, password);
      else await authApi.register(name, email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="hairline border-b border-border px-6 py-5">
        <FiapLogo />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md hairline border border-primary/50 bg-background p-8">
          <p className="fiap-eyebrow text-primary">Video Processor</p>
          <h1 className="fiap-heading mt-3 text-2xl text-foreground">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login"
              ? "Access your account to upload and process videos."
              : "Register to start processing your videos."}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="fiap-eyebrow text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="hairline h-11 border-border bg-secondary/40"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="fiap-eyebrow text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="hairline h-11 border-border bg-secondary/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="fiap-eyebrow text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="hairline h-11 border-border bg-secondary/40"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="fiap-eyebrow h-11 w-full"
              disabled={loading || !hydrated}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in →" : "Create account →"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="fiap-eyebrow text-primary hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      <footer className="hairline border-t border-border px-6 py-4">
        <p className="fiap-eyebrow text-muted-foreground">
          FIAP X <span className="text-primary">■</span> Video Processing Platform
        </p>
      </footer>
    </main>
  );
}
