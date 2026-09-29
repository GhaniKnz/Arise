import { SHOP_ITEMS } from "@/lib/data/shop";
import { guard, json } from "@/lib/server/guard";

const UA = "ARISE/1.0 (personal fitness tracker)";
const ALLOWED = new Set(SHOP_ITEMS.map((s) => s.openPrices).filter(Boolean));
const TTL = 12 * 3600_000;
const cache = new Map<string, { at: number; body: unknown }>();

interface OpenPrice {
  price: number;
  price_per: "KILOGRAM" | "UNIT" | null;
  date: string;
  labels_tags?: string[];
  location?: { osm_brand?: string | null; osm_name?: string | null; osm_address_country_code?: string | null } | null;
}

export interface StorePrice {
  store: string;
  median: number;
  min: number;
  max: number;
  count: number;
  last: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Recent real prices from Open Prices (Open Food Facts, ODbL), France only,
 * grouped by store brand. Covers mostly fresh produce sold by weight.
 */
export async function GET(req: Request) {
  const blocked = guard(req, "prices", 30);
  if (blocked) return blocked;
  const category = new URL(req.url).searchParams.get("category") ?? "";
  if (!ALLOWED.has(category)) return json({ error: "invalid", message: "Catégorie inconnue." }, 400);

  const hit = cache.get(category);
  if (hit && Date.now() - hit.at < TTL) return json(hit.body, 200, { "Cache-Control": "public, max-age=3600" });

  const since = new Date(Date.now() - 183 * 86400_000).toISOString().slice(0, 10);
  const url = new URL("https://prices.openfoodfacts.org/api/v1/prices");
  url.searchParams.set("category_tag", category);
  url.searchParams.set("currency", "EUR");
  url.searchParams.set("date__gte", since);
  url.searchParams.set("order_by", "-date");
  url.searchParams.set("size", "100");

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) return json({ error: "upstream", message: "Open Prices indisponible." }, 502);
    const data = (await res.json()) as { items?: OpenPrice[] };
    const fr = (data.items ?? []).filter((p) => p.location?.osm_address_country_code === "FR" && p.price > 0);
    // Compare like with like: the dominant pricing unit, conventional first.
    const unitCount = new Map<string, number>();
    for (const p of fr) unitCount.set(p.price_per ?? "UNIT", (unitCount.get(p.price_per ?? "UNIT") ?? 0) + 1);
    const unit = [...unitCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "KILOGRAM";
    const sameUnit = fr.filter((p) => (p.price_per ?? "UNIT") === unit);
    const conventional = sameUnit.filter((p) => !p.labels_tags?.includes("en:organic"));
    const rows = conventional.length >= 3 ? conventional : sameUnit;

    const byStore = new Map<string, OpenPrice[]>();
    for (const p of rows) {
      const store = (p.location?.osm_brand || p.location?.osm_name || "Autre").trim();
      byStore.set(store, [...(byStore.get(store) ?? []), p]);
    }
    const stores: StorePrice[] = [...byStore.entries()]
      .map(([store, ps]) => ({
        store,
        median: Math.round(median(ps.map((p) => p.price)) * 100) / 100,
        min: Math.min(...ps.map((p) => p.price)),
        max: Math.max(...ps.map((p) => p.price)),
        count: ps.length,
        last: ps.map((p) => p.date).sort().at(-1)!,
      }))
      .sort((a, b) => b.count - a.count || a.median - b.median)
      .slice(0, 8);

    const body = {
      category,
      unit: unit === "KILOGRAM" ? "kg" : "pièce",
      organicOnly: rows !== conventional,
      observations: rows.length,
      since,
      stores,
      overall: rows.length ? Math.round(median(rows.map((p) => p.price)) * 100) / 100 : null,
    };
    cache.set(category, { at: Date.now(), body });
    return json(body, 200, { "Cache-Control": "public, max-age=3600" });
  } catch {
    return json({ error: "unreachable", message: "Open Prices injoignable." }, 504);
  }
}
