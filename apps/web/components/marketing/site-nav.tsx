import Link from "next/link";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Compare", href: "/compare" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
];

const BrandMark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
    <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" opacity="0.28" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" />
  </svg>
);

export function SiteNav() {
  return (
    <header className="lp-nav">
      <Link href="/" className="lp-brand" aria-label="GlassBox home">
        <span className="lp-mark">
          <BrandMark />
        </span>
        <span className="lp-wordmark">GlassBox</span>
      </Link>
      <nav className="lp-navlinks" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="lp-navcta">
        <Link href="/sign-in" className="lp-link-muted">
          Sign in
        </Link>
        <Link href="/sign-up" className="lp-btn lp-btn-primary">
          Get started
        </Link>
      </div>
    </header>
  );
}
