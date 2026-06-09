import type { Metadata } from "next";
import "~/styles/globals.css";
import "~/styles/themes.css";
import { TRPCReactProvider } from "~/trpc/client";

export const metadata: Metadata = {
  title: "GlassBox Engine — Agentic Recommender Infrastructure",
  description:
    "Connect a catalog, align ranking to business intent, and ship transparent recommendations with traces, simulation, and deployment workflows.",
  keywords: ["recommendation engine", "personalization", "ranking", "explainable AI", "agentic ML"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="quartz" suppressHydrationWarning>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
