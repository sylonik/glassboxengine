"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PRODUCTS, type Product } from "./catalog";
import { useTracker } from "../components/tracker-provider";
import {
  trackAddToCart,
  trackRemoveFromCart,
  type CartLine,
} from "./events";

const STORAGE_KEY = "gb_demo_cart";

/** Persisted shape: productId -> quantity. */
type StoredCart = Record<string, number>;

interface CartContextValue {
  items: CartLine[];
  count: number;
  total: number;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadStored(): StoredCart {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredCart;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const tracker = useTracker();
  const [stored, setStored] = useState<StoredCart>({});
  const [hydrated, setHydrated] = useState(false);

  // Mirror of `stored` for reads inside callbacks without stale closures.
  const storedRef = useRef<StoredCart>(stored);
  storedRef.current = stored;

  useEffect(() => {
    setStored(loadStored());
    setHydrated(true);
  }, []);

  // Persist after hydration so we never clobber storage with the empty default.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* ignore storage errors */
    }
  }, [stored, hydrated]);

  const items: CartLine[] = useMemo(() => {
    const lines: CartLine[] = [];
    for (const [id, qty] of Object.entries(stored)) {
      const product = PRODUCTS.find((p) => p.id === id);
      if (product && qty > 0) lines.push({ product, quantity: qty });
    }
    return lines;
  }, [stored]);

  const total = useMemo(
    () => items.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, l) => sum + l.quantity, 0),
    [items]
  );

  const add = useCallback(
    (product: Product, quantity = 1) => {
      // Compute the post-add cart value from the latest snapshot, then emit the
      // event exactly once — outside the state updater so StrictMode's
      // double-invoke of updaters can't double-fire the analytics event.
      const prev = storedRef.current;
      const next = { ...prev, [product.id]: (prev[product.id] ?? 0) + quantity };
      const cartValue = Object.entries(next).reduce((sum, [id, q]) => {
        const p = PRODUCTS.find((x) => x.id === id);
        return p ? sum + p.price * q : sum;
      }, 0);
      trackAddToCart(tracker, product, quantity, cartValue);
      setStored(next);
    },
    [tracker]
  );

  const remove = useCallback(
    (productId: string) => {
      const product = PRODUCTS.find((p) => p.id === productId);
      if (product) trackRemoveFromCart(tracker, product);
      setStored((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    [tracker]
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setStored((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setStored({});
  }, []);

  return (
    <CartContext.Provider
      value={{ items, count, total, add, remove, setQuantity, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
