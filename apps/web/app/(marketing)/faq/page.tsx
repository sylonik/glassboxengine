import type { Metadata } from "next";
import { MarketingPageView } from "~/components/marketing/page-view";
import { pageMetadata } from "~/lib/seo";
import { page } from "~/lib/marketing/pages/faq";

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.slug,
  keywords: page.keywords,
});

export default function Page() {
  return <MarketingPageView page={page} />;
}
