import React from "react";
import { supabase } from "@/integrations/supabase/client";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  reloading: boolean;
};

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i;
const CHUNK_RELOAD_KEY = "dde_chunk_reload_at";
// A second chunk failure inside this window shows the error screen instead of
// reloading again, so a real outage can't put the page in a reload loop.
const CHUNK_RELOAD_WINDOW_MS = 60_000;
const REPORT_WAIT_MS = 1500;

const isChunkLoadError = (error: unknown): boolean => {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && CHUNK_ERROR_PATTERN.test(message);
};

// Claims the one automatic reload for this window. Returns false when storage
// is unavailable, because without it the loop guard can't work.
const claimChunkReload = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY));
    if (Number.isFinite(last) && Date.now() - last < CHUNK_RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    reloading: false,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { hasError: true, reloading: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Unhandled render error", error);
    const autoReload = isChunkLoadError(error) && claimChunkReload();
    if (!autoReload && this.state.reloading) this.setState({ reloading: false });

    let report: Promise<unknown> = Promise.resolve();
    try {
      const err = error as { message?: string; stack?: string } | null;
      report = supabase.functions
        .invoke("notify-error", {
          body: {
            source: autoReload ? "client-chunk-reload" : "client-error-boundary",
            message: err?.message ?? String(error),
            context: {
              stack: err?.stack?.slice(0, 2000) ?? null,
              componentStack: info?.componentStack?.slice(0, 2000) ?? null,
              url: typeof window !== "undefined" ? window.location.href : null,
              userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            },
          },
        })
        .catch(() => { /* non-blocking */ });
    } catch {
      /* never let the reporter throw */
    }

    if (autoReload) {
      const timeout = new Promise((resolve) => setTimeout(resolve, REPORT_WAIT_MS));
      void Promise.race([report, timeout]).then(() => window.location.reload());
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.reloading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <p className="text-sm text-muted-foreground">Loading the latest version...</p>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page hit an unexpected error. Reload and try again.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 inline-flex h-11 min-h-11 touch-manipulation items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
