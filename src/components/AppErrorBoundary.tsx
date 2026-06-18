import React from "react";
import { supabase } from "@/integrations/supabase/client";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Unhandled render error", error);
    try {
      const err = error as { message?: string; stack?: string } | null;
      void supabase.functions
        .invoke("notify-error", {
          body: {
            source: "client-error-boundary",
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
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
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
