import Link from "next/link";
import { BUILDER, CONTACT_EMAIL } from "~/lib/seo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Compare", href: "/compare" },
      { label: "Use cases", href: "/use-cases" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Explainable traces", href: "/features/explainable-recommendations" },
      { label: "Cold-start personas", href: "/features/cold-start-personas" },
      { label: "Intent alignment", href: "/features/intent-alignment" },
      { label: "Socratic mentor", href: "/features/socratic-mentor" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Live demo", href: "/dashboard" },
      { label: "FAQ", href: "/faq" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="lp-sitefooter">
      <div className="lp-sitefooter-top">
        <div className="lp-sitefooter-brand">
          <div className="lp-brand">
            <span className="lp-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
                <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" opacity="0.28" />
                <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" />
              </svg>
            </span>
            <span className="lp-wordmark">GlassBox</span>
          </div>
          <p className="lp-sitefooter-tag">
            Explainable recommendation infrastructure. Align, rank, and trace —
            every result.
          </p>
          <a className="lp-sitefooter-mail" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </div>
        <nav className="lp-sitefooter-cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.title} className="lp-sitefooter-col">
              <p className="lp-sitefooter-coltitle">{col.title}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="lp-sitefooter-bottom">
        <span>© 2026 {/* */}GlassBox Engine</span>
        <span className="lp-sitefooter-built">
          Built with{" "}
          <a href={BUILDER.url} target="_blank" rel="noopener noreferrer">
            {BUILDER.name.toLowerCase()}.se
          </a>
        </span>
      </div>
    </footer>
  );
}
