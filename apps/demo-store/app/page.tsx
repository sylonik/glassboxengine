import { Suspense } from "react";
import { ShopGrid } from "../components/shop-grid";
import { RecommendationRail } from "../components/recommendation-rail";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<div className="container" style={{ padding: "40px 0" }} />}>
        <RecommendationRail />
      </Suspense>
      <Suspense fallback={<div className="container" style={{ padding: "40px 0" }} />}>
        <ShopGrid />
      </Suspense>
    </>
  );
}
