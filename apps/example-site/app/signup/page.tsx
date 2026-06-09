"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTracker } from "../../components/tracker-provider";

export default function SignupPage() {
  const tracker = useTracker();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("Pro");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Track the signup event
    tracker?.track("signup_submit", { email, plan });
    tracker?.identify(email, { name, plan });

    // Navigate to dashboard
    router.push("/dashboard");
  }

  return (
    <main
      style={{
        padding: "64px 32px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          textAlign: "center",
          margin: "0 0 8px",
        }}
      >
        Create your account
      </h1>
      <p
        style={{
          textAlign: "center",
          color: "#6b7280",
          margin: "0 0 32px",
        }}
      >
        Start your free trial today
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#fff",
          padding: "32px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div>
          <label
            htmlFor="name"
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="plan"
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Plan
          </label>
          <select
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxSizing: "border-box",
              background: "#fff",
            }}
          >
            <option value="Starter">Starter - $9/mo</option>
            <option value="Pro">Pro - $29/mo</option>
            <option value="Enterprise">Enterprise - $99/mo</option>
          </select>
        </div>

        <button
          type="submit"
          style={{
            padding: "12px",
            background: "#6366f1",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            fontSize: "16px",
            cursor: "pointer",
            marginTop: "8px",
          }}
        >
          Create Account
        </button>
      </form>
    </main>
  );
}
