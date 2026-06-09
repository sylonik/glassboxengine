"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "~/lib/auth_client";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid credentials. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Invalid credentials. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
            <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" opacity="0.3" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
          </svg>
        </div>
        <span className="auth-logo-text">GlassBox</span>
      </div>

      {/* Card */}
      <div className="card auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your engine dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error animate-fade-in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span className="text-muted text-sm">Don&apos;t have an account?</span>
          <Link href="/sign-up" className="auth-link">
            Create account
          </Link>
        </div>
      </div>

      <style>{`
        .auth-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-8);
          justify-content: center;
        }
        .auth-logo-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent);
          background: var(--color-accent-subtle);
          border-radius: var(--radius-lg);
        }
        .auth-logo-text {
          font-size: var(--text-xl);
          font-weight: var(--font-bold);
          color: var(--color-text);
          letter-spacing: -0.02em;
        }
        .auth-card {
          padding: var(--space-8);
        }
        .auth-header {
          margin-bottom: var(--space-6);
        }
        .auth-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--color-text);
          margin-bottom: var(--space-2);
          letter-spacing: -0.02em;
        }
        .auth-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .auth-field {
          display: flex;
          flex-direction: column;
        }
        .auth-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          font-size: var(--text-sm);
          color: var(--color-danger);
          background: var(--color-danger-subtle);
          border-radius: var(--radius);
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .auth-submit {
          margin-top: var(--space-2);
          height: 44px;
          font-size: var(--text-base);
        }
        .auth-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          margin-top: var(--space-6);
          padding-top: var(--space-6);
          border-top: 1px solid var(--color-border);
        }
        .auth-link {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
        }
      `}</style>
    </div>
  );
}
