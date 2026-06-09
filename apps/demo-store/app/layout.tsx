import type { Metadata } from "next";
import "./globals.css";
import { TrackerProvider } from "../components/tracker-provider";
import { ShopperProvider } from "../lib/shopper-context";
import { CartProvider } from "../lib/cart";
import { Header } from "../components/header";

export const metadata: Metadata = {
  title: "Glassbox Demo Store",
  description:
    "A public e-commerce demo storefront emitting user events into the Glassbox engine for tracking and persona-building.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TrackerProvider>
          <ShopperProvider>
            <CartProvider>
              <Header />
              <main>{children}</main>
            </CartProvider>
          </ShopperProvider>
        </TrackerProvider>
      </body>
    </html>
  );
}
