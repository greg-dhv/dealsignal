import { createClient } from "@/lib/supabase/server";
import { DealsGrid } from "@/components/DealsGrid";
import { Deal, SignalLabel } from "@/types/database";

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

async function getDeals(): Promise<Deal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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

  if (error) {
    console.error("Error fetching deals:", error);
    return [];
  }

  return data.map((product) => {
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
      name: product.name,
      display_name: product.display_name,
      teaser: product.teaser,
      category: product.category,
      platforms: product.platforms || [],
      retailer: product.retailer || "Amazon US",
      rating: product.rating,
      review_count: product.review_count,
      image_url: product.image_url,
      amazon_asin: product.amazon_asin,
      affiliate_url: product.affiliate_url,
      is_active: product.is_active,
      created_at: product.created_at,
      original_price: latestPrice.original_price,
      current_price: latestPrice.current_price,
      discount_percent: latestPrice.discount_percent,
      checked_at: latestPrice.checked_at,
      all_time_low: latestPrice.all_time_low,
      low_90d: latestPrice.low_90d,
      low_30d: latestPrice.low_30d,
      previous_price: latestPrice.previous_price,
      signal_label: signalLabel,
    };
  });
}

async function getCategories(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true);

  if (!data) return [];

  const categories = [...new Set(data.map((p) => p.category))];
  return categories.sort();
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  const params = await searchParams;
  const deals = await getDeals();
  const categories = await getCategories();

  return (
    <main className="min-h-screen bg-[#0d1015] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Gaming Deals</h1>
          <p className="text-white/50 text-sm">
            Curated deals on gaming gear, updated daily.
          </p>
        </div>

        {/* Deals grid with filters */}
        {deals.length === 0 ? (
          <p className="text-white/50">No active deals right now.</p>
        ) : (
          <DealsGrid deals={deals} categories={categories} partnerSite={params.partner} />
        )}
      </div>
    </main>
  );
}
