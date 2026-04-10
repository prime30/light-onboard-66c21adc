/**
 * AuthBootFallback — lightweight right-panel-only skeleton used as
 * a Suspense fallback for lazy routes inside RegistrationLayout.
 *
 * RegistrationLayout already renders the real LeftPanel + header,
 * so this component must only fill the right-panel content area.
 * Rendering a full-page skeleton here was the root cause of the
 * "competing skeletons" bug.
 */

type BlockProps = {
  width: string;
  height: string;
  radius?: string;
  opacity?: number;
};

function DarkBlock({ width, height, radius = "999px", opacity = 1 }: BlockProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        opacity,
        background:
          "linear-gradient(90deg, hsl(var(--muted) / 0.72) 0%, hsl(var(--background) / 0.96) 50%, hsl(var(--muted) / 0.72) 100%)",
        backgroundSize: "200% 100%",
        animation: "auth-boot-shimmer 1.25s linear infinite",
      }}
    />
  );
}

/**
 * Right-panel content skeleton only — no left panel, no full-page wrapper.
 * Sits inside RegistrationLayout's <Outlet />.
 */
export function AuthBootFallback() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <style>{`
        @keyframes auth-boot-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>

      {/* Form content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding: "24px 32px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "38rem",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <DarkBlock width="118px" height="12px" radius="8px" opacity={0.7} />
          <DarkBlock width="66%" height="40px" radius="12px" />
          <DarkBlock width="88%" height="18px" radius="8px" opacity={0.75} />
          <div style={{ height: "8px" }} />
          <DarkBlock width="100%" height="56px" radius="16px" opacity={0.9} />
          <DarkBlock width="100%" height="56px" radius="16px" opacity={0.9} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <DarkBlock width="100%" height="56px" radius="16px" opacity={0.9} />
            <DarkBlock width="100%" height="56px" radius="16px" opacity={0.9} />
          </div>
          <DarkBlock width="100%" height="120px" radius="22px" opacity={0.7} />
        </div>
      </div>

      {/* Footer area */}
      <div style={{ padding: "0 25px 25px" }}>
        <div
          style={{
            maxWidth: "38rem",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <DarkBlock width="44px" height="44px" radius="999px" opacity={0.6} />
          <DarkBlock width="184px" height="48px" radius="999px" />
        </div>
      </div>
    </div>
  );
}

/**
 * Generic full-page fallback for non-layout routes (Index, Reviews, Blog, NotFound).
 * These are NOT inside RegistrationLayout so they need their own full-page skeleton.
 */
export function GenericBootFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "hsl(var(--background))",
        padding: "24px",
      }}
    >
      <style>{`
        @keyframes auth-boot-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>
      <DarkBlock width="240px" height="18px" radius="10px" />
    </div>
  );
}
