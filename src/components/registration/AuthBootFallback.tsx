import logoSvg from "@/assets/logo.svg";

type BlockProps = {
  width: string;
  height: string;
  radius?: string;
  opacity?: number;
};

function Block({ width, height, radius = "999px", opacity = 1 }: BlockProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        opacity,
        background:
          "linear-gradient(90deg, hsla(0, 0%, 100%, 0.12) 0%, hsla(0, 0%, 100%, 0.24) 50%, hsla(0, 0%, 100%, 0.12) 100%)",
        backgroundSize: "200% 100%",
        animation: "auth-boot-shimmer 1.25s linear infinite",
      }}
    />
  );
}

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
          "linear-gradient(90deg, hsla(28, 18%, 84%, 0.55) 0%, hsla(28, 18%, 92%, 0.92) 50%, hsla(28, 18%, 84%, 0.55) 100%)",
        backgroundSize: "200% 100%",
        animation: "auth-boot-shimmer 1.25s linear infinite",
      }}
    />
  );
}

export function AuthBootFallback() {
  const isDesktop = typeof window !== "undefined" ? window.innerWidth >= 1024 : true;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "hsl(36 33% 96%)",
      }}
    >
      <style>{`
        @keyframes auth-boot-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: isDesktop ? "row" : "column",
          overflow: "hidden",
          background: "hsl(36 33% 96%)",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            flex: isDesktop ? "0 0 50%" : "0 0 auto",
            minHeight: isDesktop ? "auto" : "220px",
            margin: isDesktop ? "20px 0 20px 20px" : "10px 10px 0 10px",
            borderRadius: "20px",
            background:
              "linear-gradient(160deg, hsl(24 18% 12%) 0%, hsl(20 20% 18%) 48%, hsl(18 24% 24%) 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at top right, hsla(0, 0%, 100%, 0.12), transparent 35%), radial-gradient(circle at bottom left, hsla(0, 0%, 100%, 0.08), transparent 40%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: isDesktop ? "40px" : "20px",
              left: isDesktop ? "40px" : "20px",
              right: isDesktop ? "40px" : "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <img src={logoSvg} alt="Drop Dead" style={{ height: "18px", width: "auto", opacity: 0.9 }} />
            {isDesktop ? <Block width="56px" height="56px" radius="999px" opacity={0.8} /> : null}
          </div>

          <div
            style={{
              position: "absolute",
              left: isDesktop ? "40px" : "20px",
              right: isDesktop ? "40px" : "20px",
              bottom: isDesktop ? "80px" : "56px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <Block width="156px" height="28px" opacity={0.8} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Block width="62%" height="52px" radius="14px" opacity={0.85} />
              <Block width="76%" height="52px" radius="14px" />
            </div>
            <Block width="48%" height="18px" radius="8px" opacity={0.7} />
          </div>

          <div
            style={{
              position: "absolute",
              left: isDesktop ? "40px" : "20px",
              right: isDesktop ? "40px" : "20px",
              bottom: isDesktop ? "40px" : "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "10px" }}>
              <Block width="40px" height="5px" radius="999px" />
              <Block width="5px" height="5px" radius="999px" opacity={0.55} />
              <Block width="5px" height="5px" radius="999px" opacity={0.35} />
            </div>
            <Block width="108px" height="34px" radius="999px" opacity={0.7} />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            background: "hsl(36 33% 96%)",
          }}
        >
          <div
            style={{
              minHeight: isDesktop ? "80px" : "64px",
              padding: isDesktop ? "24px 25px" : "14px 12px",
              display: "grid",
              gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr 1fr",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <DarkBlock width="124px" height="38px" />
            </div>
            <div style={{ display: "flex", justifyContent: isDesktop ? "center" : "flex-end" }}>
              <DarkBlock width="142px" height="16px" radius="8px" opacity={0.65} />
            </div>
            {isDesktop ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <DarkBlock width="36px" height="36px" radius="999px" opacity={0.75} />
              </div>
            ) : null}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              padding: isDesktop ? "24px 32px 20px" : "20px 16px 16px",
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

          <div
            style={{
              padding: isDesktop ? "0 25px 25px" : "0 16px 16px",
            }}
          >
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
              <DarkBlock width={isDesktop ? "184px" : "144px"} height="48px" radius="999px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GenericBootFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "hsl(36 33% 96%)",
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