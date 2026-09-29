import { guard, json } from "@/lib/server/guard";
import { OFF_FIELDS, offToFood, type OffProduct } from "@/lib/food/off";

const UA = "ARISE/1.0 (personal fitness tracker)";

export async function GET(req: Request) {
  const blocked = guard(req, "food-search", 40);
  if (blocked) return blocked;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return json({ foods: [] });

  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", `${q} countries_tags:"en:france"`);
  url.searchParams.set("page_size", "24");
  url.searchParams.set("langs", "fr");
  url.searchParams.set("fields", OFF_FIELDS);

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!res.ok) return json({ foods: [], error: "upstream" }, 502);
    const data = (await res.json()) as { hits?: OffProduct[] };
    const foods = (data.hits ?? []).map(offToFood).filter((f) => f != null);
    return json({ foods }, 200, { "Cache-Control": "public, max-age=600" });
  } catch {
    return json({ foods: [], error: "unreachable" }, 504);
  }
}
