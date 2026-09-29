import { guard, json } from "@/lib/server/guard";
import { isValidBarcode, OFF_FIELDS, offToFood, type OffProduct } from "@/lib/food/off";

const UA = "ARISE/1.0 (personal fitness tracker)";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const blocked = guard(req, "barcode", 60);
  if (blocked) return blocked;
  const { code } = await params;
  if (!isValidBarcode(code)) return json({ error: "invalid", message: "Code-barres invalide." }, 400);

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (res.status === 404) return json({ error: "not_found", message: "Produit introuvable dans Open Food Facts." }, 404);
    if (!res.ok) return json({ error: "upstream", message: "Open Food Facts ne répond pas." }, 502);
    const data = (await res.json()) as { status?: number; product?: OffProduct };
    if (!data.product || data.status === 0) return json({ error: "not_found", message: "Produit introuvable dans Open Food Facts." }, 404);
    const food = offToFood({ ...data.product, code });
    if (!food) return json({ error: "incomplete", message: "Ce produit n'a pas de valeurs nutritionnelles complètes.", name: data.product.product_name ?? null }, 422);
    return json({ food }, 200, { "Cache-Control": "public, max-age=86400" });
  } catch {
    return json({ error: "unreachable", message: "Connexion impossible à Open Food Facts." }, 504);
  }
}
