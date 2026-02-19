import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limitParam = searchParams.get("limit");

  const supabase = await createClient();

  // Get active deals: products with latest price that has a discount
  let query = supabase
    .from("products")
    .select(`
      *,
      prices!inner (
        original_price,
        current_price,
        discount_percent,
        checked_at
      )
    `)
    .eq("is_active", true)
    .gt("prices.discount_percent", 0)
    .order("checked_at", { referencedTable: "prices", ascending: false });

  // Only apply limit if explicitly provided
  if (limitParam) {
    query = query.limit(parseInt(limitParam));
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the response (take the latest price per product)
  const deals = data?.map((product) => {
    const latestPrice = Array.isArray(product.prices)
      ? product.prices[0]
      : product.prices;

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      image_url: product.image_url,
      affiliate_url: product.affiliate_url,
      original_price: latestPrice.original_price,
      current_price: latestPrice.current_price,
      discount_percent: latestPrice.discount_percent,
      checked_at: latestPrice.checked_at,
    };
  });

  return NextResponse.json(deals, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
