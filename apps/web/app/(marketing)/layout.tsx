import "./marketing.css";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SiteNav } from "~/components/marketing/site-nav";
import { SiteFooter } from "~/components/marketing/site-footer";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--lp-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--lp-mono",
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`lp ${display.variable} ${mono.variable}`}>
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}
