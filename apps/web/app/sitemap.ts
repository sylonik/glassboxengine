import type { MetadataRoute } from "next";
import { absoluteUrl } from "~/lib/seo";

/** Public, indexable marketing routes. Dashboard/auth/API are intentionally excluded. */
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/compare", priority: 0.9, changeFrequency: "monthly" },
  { path: "/features", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/explainable-recommendations", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/cold-start-personas", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/intent-alignment", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/socratic-mentor", priority: 0.7, changeFrequency: "monthly" },
  { path: "/use-cases", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
