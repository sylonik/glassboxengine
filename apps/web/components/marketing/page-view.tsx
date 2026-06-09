import Link from "next/link";
import type { Block, MarketingPage } from "~/lib/marketing/content";
import { collectFaq } from "~/lib/marketing/content";
import { breadcrumbLd, faqLd, techArticleLd } from "~/lib/seo";
import { JsonLd } from "./json-ld";

const EXPLORE = [
  { label: "Compare", href: "/compare", desc: "GlassBox vs black-box recommenders" },
  { label: "Features", href: "/features", desc: "Explainability, cold start, alignment, mentor" },
  { label: "Use cases", href: "/use-cases", desc: "E-commerce, marketplaces, media, B2B" },
  { label: "Pricing", href: "/pricing", desc: "Free to start" },
  { label: "FAQ", href: "/faq", desc: "Common questions, answered" },
  { label: "Contact", href: "/contact", desc: "Demos, enterprise, partnerships" },
];

const ACCENTS: Record<string, string> = {
  indigo: "var(--lp-indigo)",
  cyan: "var(--lp-cyan)",
  emerald: "var(--lp-emerald)",
  amber: "var(--lp-amber)",
};
const ACCENT_ORDER = ["indigo", "cyan", "emerald", "amber"];
const accentVar = (a: string | undefined, i: number) =>
  ACCENTS[a ?? ""] ?? ACCENTS[ACCENT_ORDER[i % 4]];

function CtaButtons({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  center,
}: {
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  center?: boolean;
}) {
  const pLabel = primaryLabel ?? "Start building";
  const pHref = primaryHref ?? "/sign-up";
  const sLabel = secondaryLabel ?? "Explore the live demo";
  const sHref = secondaryHref ?? "/dashboard";
  const external = (h: string) => h.startsWith("http") || h.startsWith("mailto:");
  return (
    <div className={`lp-cta-row${center ? " lp-center" : ""}`}>
      {external(pHref) ? (
        <a href={pHref} className="lp-btn lp-btn-primary lp-btn-lg">
          {pLabel} <span className="lp-arrow">→</span>
        </a>
      ) : (
        <Link href={pHref} className="lp-btn lp-btn-primary lp-btn-lg">
          {pLabel} <span className="lp-arrow">→</span>
        </Link>
      )}
      {sLabel &&
        (external(sHref) ? (
          <a href={sHref} className="lp-btn lp-btn-ghost lp-btn-lg">
            {sLabel}
          </a>
        ) : (
          <Link href={sHref} className="lp-btn lp-btn-ghost lp-btn-lg">
            {sLabel}
          </Link>
        ))}
    </div>
  );
}

function isPositive(cell: string) {
  const c = cell.trim().toLowerCase();
  return c === "yes" || c.startsWith("yes") || c === "✓" || c.startsWith("first-class");
}
function isNegative(cell: string) {
  const c = cell.trim().toLowerCase();
  return c === "no" || c === "—" || c === "-" || c === "none";
}

function BlockView({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case "prose":
      return (
        <section className="lp-block lp-prose">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.intro && <p className="lp-block-intro">{block.intro}</p>}
          {block.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      );

    case "featureGrid":
      return (
        <section className="lp-block">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.intro && <p className="lp-block-intro">{block.intro}</p>}
          <div className="lp-fgrid">
            {block.items?.map((item, i) => (
              <article
                key={i}
                className="lp-fcard"
                style={{ ["--c" as string]: accentVar(item.accent, i) }}
              >
                {item.title && <h3 className="lp-fcard-title">{item.title}</h3>}
                {item.body && <p className="lp-fcard-body">{item.body}</p>}
              </article>
            ))}
          </div>
        </section>
      );

    case "steps":
      return (
        <section className="lp-block">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.intro && <p className="lp-block-intro">{block.intro}</p>}
          <ol className="lp-stepsblock">
            {block.items?.map((item, i) => (
              <li key={i} className="lp-stepblock">
                <span className="lp-stepblock-no">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.title && <h3>{item.title}</h3>}
                {item.body && <p>{item.body}</p>}
              </li>
            ))}
          </ol>
        </section>
      );

    case "comparison":
      return (
        <section className="lp-block">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.intro && <p className="lp-block-intro">{block.intro}</p>}
          <div className="lp-tablewrap">
            <table className="lp-ctable">
              <thead>
                <tr>
                  {block.columns?.map((col, i) => (
                    <th key={i} className={i === 1 ? "lp-ctable-own" : undefined}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows?.map((row, ri) => (
                  <tr key={ri}>
                    <th scope="row">{row.label}</th>
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className={[
                          ci === 0 ? "lp-ctable-own" : "",
                          isPositive(cell) ? "lp-cell-pos" : "",
                          isNegative(cell) ? "lp-cell-neg" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="lp-block">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.intro && <p className="lp-block-intro">{block.intro}</p>}
          <div className="lp-faqlist">
            {block.items?.map((item, i) => (
              <details key={i} className="lp-faqitem" {...(i === 0 ? { open: true } : {})}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case "code":
      return (
        <section className="lp-block">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.intro && <p className="lp-block-intro">{block.intro}</p>}
          <div className="lp-code">
            <div className="lp-code-head">
              <span className="lp-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="lp-code-file">{block.file ?? "snippet.ts"}</span>
            </div>
            <pre className="lp-code-body">
              <code>{block.code}</code>
            </pre>
          </div>
        </section>
      );

    case "callout":
      return (
        <section className="lp-block">
          <div className="lp-callout" style={{ ["--c" as string]: accentVar(undefined, index) }}>
            {block.title && <h3 className="lp-callout-title">{block.title}</h3>}
            {block.body && <p className="lp-callout-body">{block.body}</p>}
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="lp-block lp-ctablock">
          {block.heading && <h2 className="lp-h2">{block.heading}</h2>}
          {block.body && <p className="lp-block-intro">{block.body}</p>}
          <CtaButtons
            primaryLabel={block.primaryCtaLabel}
            primaryHref={block.primaryCtaHref}
            secondaryLabel={block.secondaryCtaLabel}
            secondaryHref={block.secondaryCtaHref}
          />
        </section>
      );

    default:
      return null;
  }
}

export function MarketingPageView({ page }: { page: MarketingPage }) {
  const faq = collectFaq(page);
  const ld: object[] = [breadcrumbLd(page.breadcrumb)];
  if (faq.length) ld.push(faqLd(faq));
  if (page.slug.startsWith("/features/")) {
    ld.push(
      techArticleLd({
        title: page.title,
        description: page.description,
        path: page.slug,
      })
    );
  }
  const related = EXPLORE.filter((e) => e.href !== page.slug).slice(0, 4);

  return (
    <main className="lp-page">
      <JsonLd data={ld} />

      <nav className="lp-crumbs" aria-label="Breadcrumb">
        <ol>
          {page.breadcrumb.map((crumb, i) => (
            <li key={crumb.href}>
              {i < page.breadcrumb.length - 1 ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
              {i < page.breadcrumb.length - 1 && (
                <span className="lp-crumb-sep" aria-hidden>
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="lp-pagehero">
        <div className="lp-pagehero-glow" aria-hidden />
        <p className="lp-eyebrow">
          <span className="lp-dot" /> {page.hero.eyebrow}
        </p>
        <h1 className="lp-pagehero-h1">
          {page.hero.titleLead}{" "}
          <span className="lp-spectrum-text">{page.hero.titleAccent}</span>
        </h1>
        <p className="lp-pagehero-sub">{page.hero.sub}</p>
        <CtaButtons
          primaryLabel={page.hero.primaryCtaLabel}
          primaryHref={page.hero.primaryCtaHref}
          secondaryLabel={page.hero.secondaryCtaLabel}
          secondaryHref={page.hero.secondaryCtaHref}
        />
      </header>

      <div className="lp-blocks">
        {page.blocks.map((block, i) => (
          <BlockView key={i} block={block} index={i} />
        ))}
      </div>

      <aside className="lp-related" aria-label="Keep exploring">
        <p className="lp-eyebrow">
          <span className="lp-dot" /> Keep exploring
        </p>
        <div className="lp-related-grid">
          {related.map((r) => (
            <Link key={r.href} href={r.href} className="lp-related-card">
              <span className="lp-related-label">
                {r.label} <span className="lp-arrow">→</span>
              </span>
              <span className="lp-related-desc">{r.desc}</span>
            </Link>
          ))}
        </div>
      </aside>
    </main>
  );
}
