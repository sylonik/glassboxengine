export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section
        style={{
          padding: "80px 32px",
          textAlign: "center",
          background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)",
        }}
      >
        <h1 style={{ fontSize: "48px", fontWeight: 800, margin: "0 0 16px" }}>
          Ship faster with{" "}
          <span style={{ color: "#6366f1" }}>Acme SaaS</span>
        </h1>
        <p
          style={{
            fontSize: "20px",
            color: "#6b7280",
            maxWidth: "600px",
            margin: "0 auto 32px",
          }}
        >
          The all-in-one platform for modern teams. Analytics, collaboration,
          and automation — all in one place.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <a
            href="/signup"
            style={{
              padding: "12px 32px",
              background: "#6366f1",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "16px",
            }}
          >
            Get Started Free
          </a>
          <a
            href="/pricing"
            style={{
              padding: "12px 32px",
              background: "#fff",
              color: "#374151",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "16px",
              border: "1px solid #d1d5db",
            }}
          >
            View Pricing
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "32px",
            fontWeight: 700,
            textAlign: "center",
            margin: "0 0 48px",
          }}
        >
          Everything you need
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "32px",
          }}
        >
          {[
            {
              title: "Real-time Analytics",
              desc: "Track every metric that matters with live dashboards.",
            },
            {
              title: "Team Collaboration",
              desc: "Work together seamlessly with built-in chat and comments.",
            },
            {
              title: "Smart Automation",
              desc: "Automate repetitive tasks and focus on what matters.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              style={{
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                {feature.title}
              </h3>
              <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
