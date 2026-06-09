"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                backgroundColor: "#111827",
                color: "#fff",
                fontSize: "0.875rem",
                cursor: "pointer",
                border: "none",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
