import { NextRequest, NextResponse } from "next/server";
import { runC2Pipeline } from "@/lib/dust";
import { C2_SELLERS } from "@/data/sellers";

const cache = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const { prospectId, scrapedContent } = await req.json();

    if (!prospectId) {
      return NextResponse.json({ error: "prospectId required" }, { status: 400 });
    }

    if (cache.has(prospectId)) {
      return NextResponse.json({ cached: true, data: cache.get(prospectId) });
    }

    const seller = C2_SELLERS.find(s => s.id === prospectId);
    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const content = scrapedContent || `Seller: ${seller.name}\nCategories: ${seller.categories.join(", ")}\nSKUs: ${seller.skus}\nPrice: ${seller.price}€\nRating: ${seller.rating}★ (${seller.reviews} reviews)\nFulfillment: ${seller.fulfillment}`;

    const result = await runC2Pipeline(content);
    cache.set(prospectId, result);

    return NextResponse.json({ cached: false, data: result });
  } catch (err: any) {
    console.error("C2 pipeline error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
