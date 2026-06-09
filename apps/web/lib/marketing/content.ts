/**
 * Block-based content model for GlassBox marketing/SEO pages.
 * Authored content (lib/marketing/pages/*) conforms to MarketingPage and is
 * rendered by <MarketingPageView> (components/marketing/page-view.tsx).
 */

export type Accent = "indigo" | "cyan" | "emerald" | "amber";

export interface BlockItem {
  title?: string;
  body?: string;
  q?: string;
  a?: string;
  accent?: Accent | string;
}

export interface ComparisonRow {
  label: string;
  cells: string[];
}

export type BlockType =
  | "prose"
  | "featureGrid"
  | "steps"
  | "comparison"
  | "faq"
  | "cta"
  | "code"
  | "callout";

export interface Block {
  type: BlockType;
  heading?: string;
  intro?: string;
  paragraphs?: string[];
  items?: BlockItem[];
  columns?: string[];
  rows?: ComparisonRow[];
  file?: string;
  code?: string;
  title?: string;
  body?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export interface Hero {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  sub: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export interface Crumb {
  label: string;
  href: string;
}

export interface MarketingPage {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  breadcrumb: Crumb[];
  hero: Hero;
  blocks: Block[];
}

/** Collect every FAQ Q&A across a page's blocks (for FAQPage JSON-LD). */
export function collectFaq(page: MarketingPage): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  for (const block of page.blocks) {
    if (block.type !== "faq" || !block.items) continue;
    for (const item of block.items) {
      if (item.q && item.a) out.push({ q: item.q, a: item.a });
    }
  }
  return out;
}
