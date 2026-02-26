import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SignalLabel } from "@/types/database";

// Calculate signal label based on price metrics
function getSignalLabel(
  currentPrice: number,
  allTimeLow: number | null,
  low90d: number | null,
  low30d: number | null,
  previousPrice: number | null,
  checkedAt: string
): SignalLabel {
  // Priority: Historical Low > 90-day Low > 30-day Low > Recent Drop
  if (allTimeLow !== null && currentPrice <= allTimeLow) {
    return "historical_low";
  }
  if (low90d !== null && currentPrice <= low90d) {
    return "low_90d";
  }
  if (low30d !== null && currentPrice <= low30d) {
    return "low_30d";
  }
  // Recent drop: price dropped since last check (within 24h)
  if (previousPrice !== null && currentPrice < previousPrice) {
    const checkedDate = new Date(checkedAt);
    const now = new Date();
    const hoursSinceCheck = (now.getTime() - checkedDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCheck <= 24) {
      return "recent_drop";
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const platform = searchParams.get("platform");
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
        checked_at,
        all_time_low,
        low_90d,
        low_30d,
        previous_price
      )
    `)
    .eq("is_active", true)
    .gt("prices.discount_percent", 0)
    .order("checked_at", { referencedTable: "prices", ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (platform) {
    query = query.contains("platforms", [platform]);
  }

  if (limitParam) {
    query = query.limit(parseInt(limitParam));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the response and add computed fields
  const deals = data?.map((product) => {
    const latestPrice = Array.isArray(product.prices)
      ? product.prices[0]
      : product.prices;

    const signalLabel = getSignalLabel(
      latestPrice.current_price,
      latestPrice.all_time_low,
      latestPrice.low_90d,
      latestPrice.low_30d,
      latestPrice.previous_price,
      latestPrice.checked_at
    );

    return {
      id: product.id,
      name: product.display_name || product.name,
      full_name: product.name,
      teaser: product.teaser,
      category: product.category,
      platforms: product.platforms || [],
      retailer: product.retailer || "Amazon US",
      rating: product.rating,
      review_count: product.review_count,
      image_url: product.image_url,
      affiliate_url: product.affiliate_url,
      original_price: latestPrice.original_price,
      current_price: latestPrice.current_price,
      discount_percent: latestPrice.discount_percent,
      signal_label: signalLabel,
      all_time_low: latestPrice.all_time_low,
      low_90d: latestPrice.low_90d,
      low_30d: latestPrice.low_30d,
      checked_at: latestPrice.checked_at,
    };
  });

  // Get the most recent checked_at as last_updated
  const lastUpdated = deals && deals.length > 0 ? deals[0].checked_at : null;

  return NextResponse.json({
    last_updated: lastUpdated,
    count: deals?.length || 0,
    deals,
  }, {
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
