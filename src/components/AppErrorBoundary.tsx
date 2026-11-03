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
const CHUNK_RELOAD_KEY = "dde_chunk_reloads";
// Reloads are capped per window so a real outage can't put the page in a
// reload loop. A stale tab needs one reload to pick up the new build; a second
// is allowed only while the running build is still the live one, which means
// the file exists and the connection dropped.
const CHUNK_RELOAD_WINDOW_MS = 60_000;
const MAX_RELOADS_STALE = 1;
const MAX_RELOADS_LIVE_BUILD = 2;
const REPORT_WAIT_MS = 1500;
const BUILD_CHECK_TIMEOUT_MS = 2500;
// Crawlers render pages from their own copy of an old build, so their chunk
// failures are noise in the alerts.
const BOT_UA_PATTERN = /(bot|crawler|spider)[/;\s)-]|slurp|headlesschrome|lighthouse/i;

type ReloadLog = { first: number; count: number };

const isChunkLoadError = (error: unknown): boolean => {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && CHUNK_ERROR_PATTERN.test(message);
};

const isBot = (): boolean =>
  typeof navigator !== "undefined" && BOT_UA_PATTERN.test(navigator.userAgent);

const runningBuild = (): string | null => {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script?.src.split("/").pop() ?? null;
};

// True when the page served right now still loads the build this tab runs.
// Null when that can't be told (offline, timeout, dev server).
const isBuildLive = async (build: string | null): Promise<boolean | null> => {
  if (!build || (typeof navigator !== "undefined" && navigator.onLine === false)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUILD_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(window.location.href, { cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;
    return (await res.text()).includes(`assets/${build}`);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const readReloadLog = (): ReloadLog | null => {
  const log = JSON.parse(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "null") as ReloadLog | null;
  return log && Date.now() - log.first < CHUNK_RELOAD_WINDOW_MS ? log : null;
};

// Claims an automatic reload for this window. Returns false when storage is
// unavailable, because without it the loop guard can't work.
const claimChunkReload = (maxReloads: number): boolean => {
  try {
    const log = readReloadLog() ?? { first: Date.now(), count: 0 };
    if (log.count >= maxReloads) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ first: log.first, count: log.count + 1 }));
    return true;
  } catch {
    return false;
  }
};

const reloadHistory = (): { reloadsInWindow: number; secondsSinceFirstReload: number | null } => {
  try {
    const log = readReloadLog();
    return {
      reloadsInWindow: log?.count ?? 0,
      secondsSinceFirstReload: log ? Math.round((Date.now() - log.first) / 1000) : null,
    };
  } catch {
    return { reloadsInWindow: 0, secondsSinceFirstReload: null };
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
    if (!isChunkLoadError(error)) {
      this.report(error, info, "client-error-boundary", {});
      return;
    }
    void this.recoverFromChunkError(error, info);
  }

  private async recoverFromChunkError(error: unknown, info: React.ErrorInfo) {
    const build = runningBuild();
    const history = reloadHistory();
    const buildLive = await isBuildLive(build);
    const autoReload = claimChunkReload(buildLive === true ? MAX_RELOADS_LIVE_BUILD : MAX_RELOADS_STALE);
    if (!autoReload) this.setState({ reloading: false });

    const report = this.report(error, info, autoReload ? "client-chunk-reload" : "client-error-boundary", {
      build,
      buildLive,
      onLine: typeof navigator !== "undefined" ? navigator.onLine : null,
      ...history,
    });

    if (autoReload) {
      const timeout = new Promise((resolve) => setTimeout(resolve, REPORT_WAIT_MS));
      void Promise.race([report, timeout]).then(() => window.location.reload());
    }
  }

  private report(
    error: unknown,
    info: React.ErrorInfo,
    source: "client-chunk-reload" | "client-error-boundary",
    extra: Record<string, unknown>,
  ): Promise<unknown> {
    if (isBot()) return Promise.resolve();
    try {
      const err = error as { message?: string; stack?: string } | null;
      return supabase.functions
        .invoke("notify-error", {
          body: {
            source,
            message: err?.message ?? String(error),
            context: {
              stack: err?.stack?.slice(0, 2000) ?? null,
              componentStack: info?.componentStack?.slice(0, 2000) ?? null,
              url: typeof window !== "undefined" ? window.location.href : null,
              userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
              ...extra,
            },
          },
        })
        .catch(() => { /* non-blocking */ });
    } catch {
      /* never let the reporter throw */
      return Promise.resolve();
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
