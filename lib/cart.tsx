"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartLine } from "@/lib/types";

/**
 * Cart state.
 *
 * Guests: the cart lives in this browser (localStorage).
 * Signed-in users: the cart lives in Supabase (table cart_items), so the
 * website and the mobile app share one cart. A Realtime subscription
 * refreshes the cart the moment another device changes it. On sign-in,
 * anything in the guest cart is merged into the account cart.
 */

const STORAGE_KEY = "mickyhill-cart-v1";
const MAX_QTY = 20;

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotalKobo: number;
  ready: boolean;
  /** True when the cart is stored in the user's account (shared across devices). */
  synced: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    if (lines.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage blocked: the cart still works for this visit.
  }
}

type RemoteRow = {
  product_id: string;
  quantity: number;
  products: { slug: string; name: string; price_kobo: number; accent: string } | null;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  // undefined = not checked yet, null = guest, string = signed-in user id
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  // Which store the current `lines` came from. Set together with `lines`.
  const [mode, setMode] = useState<"guest" | "account" | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Who is signed in? ----
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  // ---- Load the account cart from Supabase ----
  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("cart_items")
      .select("product_id, quantity, products (slug, name, price_kobo, accent)")
      .order("updated_at", { ascending: true })
      .returns<RemoteRow[]>();

    if (error) {
      console.error("Could not load cart", error);
      return;
    }
    setLines(
      (data ?? [])
        .filter((row) => row.products)
        .map((row) => ({
          productId: row.product_id,
          slug: row.products!.slug,
          name: row.products!.name,
          priceKobo: row.products!.price_kobo,
          accent: row.products!.accent,
          quantity: row.quantity,
        })),
    );
  }, [supabase]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void refresh(), 150);
  }, [refresh]);

  // ---- Switch between guest cart and account cart ----
  useEffect(() => {
    if (userId === undefined) return;

    if (userId === null) {
      setLines(readStorage());
      setMode("guest");
      setReady(true);
      return;
    }

    let cancelled = false;
    setMode("account");

    (async () => {
      // Move anything from the guest cart into the account cart.
      const guestLines = readStorage();
      for (const line of guestLines) {
        const { error } = await supabase.rpc("cart_add", {
          p_product_id: line.productId,
          p_quantity: line.quantity,
        });
        if (error) console.error("Could not merge cart line", error);
      }
      if (guestLines.length > 0) writeStorage([]);

      if (!cancelled) {
        await refresh();
        setReady(true);
      }
    })();

    // Live updates from any device signed in to this account.
    const channel = supabase
      .channel(`cart-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cart_items" }, () =>
        scheduleRefresh(),
      )
      .subscribe();

    // Fallback: refresh when the tab comes back into view.
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, supabase, refresh, scheduleRefresh]);

  // ---- Persist the guest cart ----
  useEffect(() => {
    if (ready && mode === "guest") writeStorage(lines);
  }, [lines, ready, mode]);

  const signedIn = typeof userId === "string";

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === line.productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === line.productId
              ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) }
              : l,
          );
        }
        return [...prev, { ...line, quantity: Math.min(MAX_QTY, quantity) }];
      });

      if (signedIn) {
        void supabase
          .rpc("cart_add", { p_product_id: line.productId, p_quantity: quantity })
          .then(({ error }) => {
            if (error) console.error("Could not add to cart", error);
            scheduleRefresh();
          });
      }
    },
    [signedIn, supabase, scheduleRefresh],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const next = Math.min(MAX_QTY, quantity);
      setLines((prev) =>
        next <= 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, quantity: next } : l)),
      );

      if (signedIn) {
        void supabase
          .rpc("cart_set", { p_product_id: productId, p_quantity: next })
          .then(({ error }) => {
            if (error) console.error("Could not update cart", error);
            scheduleRefresh();
          });
      }
    },
    [signedIn, supabase, scheduleRefresh],
  );

  const remove = useCallback(
    (productId: string) => setQuantity(productId, 0),
    [setQuantity],
  );

  const clear = useCallback(() => {
    setLines([]);
    if (signedIn) {
      // place_order() already empties the account cart; this is a safety net.
      void supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId as string)
        .then(({ error }) => {
          if (error) console.error("Could not clear cart", error);
        });
    }
  }, [signedIn, supabase, userId]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      synced: signedIn,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalKobo: lines.reduce((n, l) => n + l.priceKobo * l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, ready, signedIn, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export { MAX_QTY };
