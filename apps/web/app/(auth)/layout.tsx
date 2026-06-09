import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — GlassBox Engine",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-layout-bg" />
      <main className="auth-layout-content">{children}</main>
      <style>{`
        .auth-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .auth-layout-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 50%, var(--color-accent-subtle) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(94, 90, 219, 0.06) 0%, transparent 50%),
            var(--color-bg);
          z-index: 0;
        }
        .auth-layout-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: var(--space-6);
        }
      `}</style>
    </div>
  );
}
