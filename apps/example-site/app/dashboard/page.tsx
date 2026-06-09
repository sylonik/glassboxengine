"use client";

import { useEffect, useRef } from "react";
import { useTracker } from "../../components/tracker-provider";

export default function DashboardPage() {
  const tracker = useTracker();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    // Track onboarding completion
    tracker?.track("onboarding_complete");
  }, [tracker]);

  return (
    <main style={{ padding: "64px 32px", maxWidth: "800px", margin: "0 auto" }}>
      <div
        style={{
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          marginBottom: "32px",
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px", color: "#065f46" }}>
          Welcome to Acme SaaS!
        </h1>
        <p style={{ color: "#047857", margin: 0 }}>
          Your account has been created successfully.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {[
          { label: "Projects", value: "0" },
          { label: "Team Members", value: "1" },
          { label: "API Calls", value: "0" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "24px",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", fontWeight: 700 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          padding: "32px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 16px" }}>
          Getting Started
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            "Create your first project",
            "Invite team members",
            "Connect your data source",
            "Set up automations",
          ].map((step, i) => (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#6b7280",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <span style={{ fontSize: "14px", color: "#374151" }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
