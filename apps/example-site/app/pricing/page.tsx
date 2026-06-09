"use client";

import { useTracker } from "../../components/tracker-provider";

const plans = [
  {
    name: "Starter",
    price: "$9",
    features: ["5 team members", "10GB storage", "Basic analytics"],
  },
  {
    name: "Pro",
    price: "$29",
    features: [
      "Unlimited members",
      "100GB storage",
      "Advanced analytics",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    features: [
      "Unlimited everything",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

export default function PricingPage() {
  const tracker = useTracker();

  function handlePlanClick(plan: string) {
    tracker?.track("pricing_plan_click", { plan });
  }

  return (
    <main style={{ padding: "64px 32px", maxWidth: "960px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          textAlign: "center",
          margin: "0 0 12px",
        }}
      >
        Simple, transparent pricing
      </h1>
      <p
        style={{
          textAlign: "center",
          color: "#6b7280",
          margin: "0 0 48px",
          fontSize: "18px",
        }}
      >
        Choose the plan that fits your team
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              padding: "32px 24px",
              borderRadius: "12px",
              border: plan.popular
                ? "2px solid #6366f1"
                : "1px solid #e5e7eb",
              background: "#fff",
              textAlign: "center",
              position: "relative",
            }}
          >
            {plan.popular && (
              <span
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#6366f1",
                  color: "#fff",
                  padding: "4px 16px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Most Popular
              </span>
            )}
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                margin: "0 0 8px",
              }}
            >
              {plan.name}
            </h3>
            <div
              style={{
                fontSize: "40px",
                fontWeight: 800,
                margin: "0 0 4px",
              }}
            >
              {plan.price}
              <span style={{ fontSize: "16px", color: "#9ca3af" }}>/mo</span>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "24px 0",
                textAlign: "left",
              }}
            >
              {plan.features.map((f) => (
                <li
                  key={f}
                  style={{
                    padding: "6px 0",
                    color: "#4b5563",
                    fontSize: "14px",
                  }}
                >
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              onClick={() => handlePlanClick(plan.name)}
              style={{
                display: "block",
                padding: "10px 24px",
                background: plan.popular ? "#6366f1" : "#f3f4f6",
                color: plan.popular ? "#fff" : "#374151",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Get Started
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
