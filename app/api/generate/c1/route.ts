import { NextRequest, NextResponse } from "next/server";
import { runC1Pipeline } from "@/lib/dust";
import { C1_BRANDS } from "@/data/brands";

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

    const brand = C1_BRANDS.find(b => b.id === prospectId);
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const content = scrapedContent || `Brand: ${brand.name}\nOrigin: ${brand.origin}\nTier: ${brand.tier}\nPrice: ${brand.price}\nDNA: ${brand.dna}`;

    const result = await runC1Pipeline(content);
    cache.set(prospectId, result);

    return NextResponse.json({ cached: false, data: result });
  } catch (err: any) {
    console.error("C1 pipeline error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
