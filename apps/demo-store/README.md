# Glassbox Demo Store

A public e-commerce demo storefront that emits realistic shopping events via the
[`@glassbox/tracker`](../../packages/tracker) SDK. Those events flow into the
Glassbox engine for tracking and persona-building. It's the "show me real
multi-user traffic" companion app for demos.

Runs on **port 3002**.

## What it does

- A polished storefront: shop home with search + category filters, product
  detail pages, cart, and checkout.
- A **shopper switcher** (4 personas) so the dashboard shows distinct users.
- A **session simulator** that scripts a realistic persona-biased shopping
  session with one click — perfect for filling the dashboard fast.
- Emits a fixed event contract (below) that the persona-builder reads.

## Environment variables

Config is read at **runtime** (via the `/api/config` route), so a deployed
Cloud Run service can set these via env **without rebuilding**.

| Variable                        | Purpose                                  | Default                  |
| ------------------------------- | ---------------------------------------- | ------------------------ |
| `GLASSBOX_API_KEY`              | Tracker API key (`gb_live_…`). Required to enable tracking. | _(empty → tracking disabled)_ |
| `GLASSBOX_ENDPOINT`             | Glassbox ingest endpoint. Events POST to `${endpoint}/api/t`. | `http://localhost:3000`  |
| `NEXT_PUBLIC_GLASSBOX_API_KEY`  | Local-dev fallback for the API key.      | —                        |
| `NEXT_PUBLIC_GLASSBOX_ENDPOINT` | Local-dev fallback for the endpoint.     | —                        |

Resolution order: `GLASSBOX_API_KEY` → `NEXT_PUBLIC_GLASSBOX_API_KEY`. If no
API key is set, the app runs fine and tracking is disabled gracefully (a
`console.warn` is logged; no events are sent).

Copy `.env.example` to `.env.local` to configure locally.

## Run

```bash
# from the monorepo root (deps installed centrally)
pnpm --filter demo-store dev      # http://localhost:3002

# build / start (standalone output, for Cloud Run)
pnpm --filter demo-store build
pnpm --filter demo-store start
```

## Event contract

Page views are auto-tracked by the tracker (`autoPageViews: true`). Custom
events and their exact property keys:

| Event            | Properties                                                                            |
| ---------------- | ------------------------------------------------------------------------------------- |
| `product_view`   | `productId, productName, category, price, currency`                                   |
| `product_click`  | `productId, productName, category, price, currency`                                   |
| `search`         | `query, resultCount`                                                                  |
| `add_to_cart`    | `productId, productName, category, price, quantity, cartValue`                        |
| `remove_from_cart` | `productId, productName, category, price`                                            |
| `checkout_start` | `cartValue, itemCount, categories: string[]`                                          |
| `purchase`       | `orderId, total, itemCount, items: [{ productId, category, price }], categories: string[]` |

`category` and `price` are always present on product-level events so downstream
persona derivation works.

## Shoppers (personas)

| Shopper           | Segment       | Leans toward            |
| ----------------- | ------------- | ----------------------- |
| Ava — Bargain Hunter | `deal-seeker` | cheap Home / Beauty     |
| Marcus — Premium Buyer | `premium`  | pricey Electronics / Fashion |
| Sam — Casual Browser | `browser`   | views a lot, rarely buys |
| Anonymous         | `anonymous`   | no `identify` call      |

Selecting a non-anonymous shopper calls `tracker.identify(id, { name, segment })`
and persists the choice in `localStorage`.
