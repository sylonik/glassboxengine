import type { Metadata, Viewport } from "next";
import "~/styles/globals.css";
import "~/styles/themes.css";
import { TRPCReactProvider } from "~/trpc/client";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "~/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GlassBox Engine — Explainable Recommendation Infrastructure",
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "recommendation engine",
    "explainable recommendation engine",
    "personalization",
    "ranking",
    "explainable AI",
    "reasoning traces",
    "recommendation cold start",
    "agentic ML",
  ],
  authors: [{ name: "Sylonik", url: "https://sylonik.se" }],
  creator: "Sylonik",
  publisher: "Sylonik",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "GlassBox Engine — Explainable Recommendation Infrastructure",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "GlassBox Engine — Explainable Recommendation Infrastructure",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
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
