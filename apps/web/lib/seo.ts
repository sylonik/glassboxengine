import type { Metadata } from "next";

/**
 * Canonical site constants + SEO helpers for the GlassBox marketing site.
 * The production domain is glassboxengine.dev; override with NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://glassboxengine.dev"
).replace(/\/$/, "");

export const SITE_NAME = "GlassBox Engine";
export const SITE_TAGLINE = "Make every recommendation explain itself.";
export const SITE_DESCRIPTION =
  "GlassBox Engine is explainable recommendation infrastructure. Align ranking to business intent with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every result.";

export const CONTACT_EMAIL = "lahiru@sylonik.se";
export const BUILDER = { name: "Sylonik", url: "https://sylonik.se" } as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** Set false for thin/utility pages that should not be indexed. */
  index?: boolean;
}

/**
 * Build per-page Metadata with a canonical URL, Open Graph and Twitter cards.
 * `title` is used verbatim (absolute) so authored titles keep their own branding.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  index = true,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* ──────────────────────────────────────────────────────────────
   JSON-LD structured data builders (schema.org)
   ────────────────────────────────────────────────────────────── */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
    logo: absoluteUrl("/icon.svg"),
    founder: { "@type": "Organization", name: BUILDER.name, url: BUILDER.url },
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
      contactType: "sales",
      availableLanguage: ["English"],
    },
    sameAs: [BUILDER.url],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, Cloud",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    creator: { "@type": "Organization", name: BUILDER.name, url: BUILDER.url },
  };
}

export function breadcrumbLd(items: { label: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
