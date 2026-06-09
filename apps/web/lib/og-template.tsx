import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Shared Open Graph card template. Each marketing route's opengraph-image.tsx
 * passes its hero so every page gets a distinct, on-brand social card.
 */
export function ogElement({
  eyebrow,
  titleLead,
  titleAccent,
}: {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#050506",
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            border: "3px solid #7b78ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 40px rgba(123,120,255,0.6)",
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "#7b78ff" }} />
        </div>
        <div style={{ color: "#ededed", fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
          GlassBox Engine
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: "#8a8a93",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 22,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 68, lineHeight: 1.06 }}>
          <span style={{ color: "#ededed" }}>{titleLead}&nbsp;</span>
          <span
            style={{
              backgroundImage:
                "linear-gradient(100deg, #7b78ff, #38d6e0 40%, #34d399 70%, #f5b34a)",
              backgroundClip: "text",
              color: "transparent",
              fontStyle: "italic",
            }}
          >
            {titleAccent}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 10 }}>
          {["#7b78ff", "#38d6e0", "#34d399", "#f5b34a"].map((c) => (
            <div key={c} style={{ height: 8, flex: 1, borderRadius: 6, background: c }} />
          ))}
        </div>
        <div style={{ display: "flex", color: "#8a8a93", fontSize: 24 }}>
          <span>Explainable recommendation infrastructure</span>
          <span style={{ marginLeft: "auto", color: "#7b78ff" }}>glassboxengine.dev</span>
        </div>
      </div>
    </div>
  );
}
