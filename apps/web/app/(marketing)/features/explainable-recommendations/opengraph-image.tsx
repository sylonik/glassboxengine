import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, ogElement } from "~/lib/og-template";
import { page } from "~/lib/marketing/pages/features-explainable-recommendations";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = page.title;

export default function Image() {
  return new ImageResponse(
    ogElement({
      eyebrow: page.hero.eyebrow,
      titleLead: page.hero.titleLead,
      titleAccent: page.hero.titleAccent,
    }),
    { ...OG_SIZE }
  );
}
