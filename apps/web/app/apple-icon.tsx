import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0c",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 30,
            border: "9px solid #7b78ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#7b78ff" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
