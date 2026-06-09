"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_SHOPPER_ID,
  SHOPPERS,
  getShopper,
  isAnonymous,
  type Shopper,
} from "./shoppers";
import { useTracker } from "../components/tracker-provider";

const STORAGE_KEY = "gb_demo_shopper";

interface ShopperContextValue {
  shopper: Shopper;
  shoppers: Shopper[];
  setShopper: (id: string) => void;
}

const ShopperContext = createContext<ShopperContextValue | null>(null);

export function ShopperProvider({ children }: { children: React.ReactNode }) {
  const tracker = useTracker();
  const [shopperId, setShopperId] = useState<string>(DEFAULT_SHOPPER_ID);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && getShopper(stored)) {
        setShopperId(stored);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const shopper = getShopper(shopperId) ?? SHOPPERS[0];

  // Identify whenever a real (non-anon) shopper is active and the tracker is
  // available. Runs on mount-with-stored-shopper and on every switch.
  useEffect(() => {
    if (!tracker) return;
    if (isAnonymous(shopper)) return;
    tracker.identify(shopper.id, {
      name: shopper.name,
      segment: shopper.segment,
    });
  }, [tracker, shopper]);

  const setShopper = useCallback((id: string) => {
    const next = getShopper(id);
    if (!next) return;
    setShopperId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return (
    <ShopperContext.Provider value={{ shopper, shoppers: SHOPPERS, setShopper }}>
      {children}
    </ShopperContext.Provider>
  );
}

export function useShopper(): ShopperContextValue {
  const ctx = useContext(ShopperContext);
  if (!ctx) {
    throw new Error("useShopper must be used within a ShopperProvider");
  }
  return ctx;
}
