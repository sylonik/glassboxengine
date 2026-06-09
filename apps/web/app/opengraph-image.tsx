import { ImageResponse } from "next/og";

export const alt =
  "GlassBox Engine — Make every recommendation explain itself.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
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
        {/* brand */}
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
          <div style={{ color: "#ededed", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            GlassBox Engine
          </div>
        </div>

        {/* headline */}
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
            Explainable recommendation infrastructure
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 76, lineHeight: 1.05 }}>
            <span style={{ color: "#ededed" }}>Make every recommendation&nbsp;</span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(100deg, #7b78ff, #38d6e0 40%, #34d399 70%, #f5b34a)",
                backgroundClip: "text",
                color: "transparent",
                fontStyle: "italic",
              }}
            >
              explain itself.
            </span>
          </div>
        </div>

        {/* spectrum bar + footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {["#7b78ff", "#38d6e0", "#34d399", "#f5b34a"].map((c) => (
              <div key={c} style={{ height: 8, flex: 1, borderRadius: 6, background: c }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, color: "#6a6a6a", fontSize: 24 }}>
            <span>align</span>
            <span style={{ color: "#7b78ff" }}>→</span>
            <span>rank</span>
            <span style={{ color: "#7b78ff" }}>→</span>
            <span>trace</span>
            <span style={{ marginLeft: "auto", color: "#8a8a93" }}>glassboxengine.dev</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
