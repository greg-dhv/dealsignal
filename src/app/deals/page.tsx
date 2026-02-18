import { createClient } from "@/lib/supabase/server";
import { DealCard } from "@/components/DealCard";
import { Deal } from "@/types/database";

async function getDeals(category?: string): Promise<Deal[]> {
  const supabase = await createClient();

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

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching deals:", error);
    return [];
  }

  return data.map((product) => {
    const latestPrice = Array.isArray(product.prices)
      ? product.prices[0]
      : product.prices;

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      image_url: product.image_url,
      amazon_asin: product.amazon_asin,
      affiliate_url: product.affiliate_url,
      is_active: product.is_active,
      created_at: product.created_at,
      original_price: latestPrice.original_price,
      current_price: latestPrice.current_price,
      discount_percent: latestPrice.discount_percent,
      checked_at: latestPrice.checked_at,
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
  searchParams: Promise<{ category?: string; partner?: string }>;
}) {
  const params = await searchParams;
  const deals = await getDeals(params.category);
  const categories = await getCategories();

  return (
    <main className="min-h-screen bg-[#0d1015] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gaming Deals</h1>
          <p className="text-white/60">
            We track prices daily and only show deals worth buying.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href="/deals"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !params.category
                ? "bg-[#00ddff] text-[#0d1015]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            All
          </a>
          {categories.map((cat) => (
            <a
              key={cat}
              href={`/deals?category=${cat}`}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                params.category === cat
                  ? "bg-[#00ddff] text-[#0d1015]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {cat}
            </a>
          ))}
        </div>

        {/* Deals grid */}
        {deals.length === 0 ? (
          <p className="text-white/50">No active deals right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                partnerSite={params.partner}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
