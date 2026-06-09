import type { Metadata } from "next";
import { TrackerProvider } from "../components/tracker-provider";

export const metadata: Metadata = {
  title: "Acme SaaS - Example Site",
  description: "Example website demonstrating GlassBox event tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: "#1a1a2e",
          background: "#fafbfc",
        }}
      >
        <TrackerProvider>
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 32px",
              borderBottom: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <a
              href="/"
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#6366f1",
                textDecoration: "none",
              }}
            >
              Acme SaaS
            </a>
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <a
                href="/pricing"
                style={{ color: "#4b5563", textDecoration: "none" }}
              >
                Pricing
              </a>
              <a
                href="/signup"
                style={{
                  padding: "8px 20px",
                  background: "#6366f1",
                  color: "#fff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Sign Up
              </a>
            </div>
          </nav>
          {children}
        </TrackerProvider>
      </body>
    </html>
  );
}
