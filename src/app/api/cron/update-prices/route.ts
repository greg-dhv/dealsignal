import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Use service role for cron job
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KEEPA_API_KEY = process.env.KEEPA_API_KEY!;

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

// Keepa time offset (minutes since Keepa epoch)
const KEEPA_TIME_OFFSET = 21564000;

// Convert Keepa timestamp to JS timestamp
function keepaTimeToTimestamp(keepaTime: number): number {
  return (keepaTime + KEEPA_TIME_OFFSET) * 60 * 1000;
}

// Get current price from Keepa price history
function getCurrentPrice(priceHistory: number[] | null): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;
  for (let i = priceHistory.length - 1; i >= 1; i -= 2) {
    const price = priceHistory[i];
    if (price > 0) return price / 100;
  }
  return null;
}

// Get all-time lowest price from full price history
function getAllTimeLow(priceHistory: number[] | null): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;

  let lowest: number | null = null;
  for (let i = 1; i < priceHistory.length; i += 2) {
    const price = priceHistory[i];
    if (price > 0) {
      const priceUSD = price / 100;
      if (lowest === null || priceUSD < lowest) {
        lowest = priceUSD;
      }
    }
  }
  return lowest;
}

// Get lowest price in last N days
function getLowestInDays(priceHistory: number[] | null, days: number): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;

  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);

  let lowest: number | null = null;
  for (let i = 0; i < priceHistory.length; i += 2) {
    const keepaTime = priceHistory[i];
    const price = priceHistory[i + 1];
    const timestamp = keepaTimeToTimestamp(keepaTime);

    if (timestamp >= cutoff && price > 0) {
      const priceUSD = price / 100;
      if (lowest === null || priceUSD < lowest) {
        lowest = priceUSD;
      }
    }
  }
  return lowest;
}

// Fetch products from Keepa API
async function fetchFromKeepa(asins: string[]): Promise<any[]> {
  const asinString = asins.join(",");
  const url = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asinString}&stats=90`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Keepa API error: ${JSON.stringify(data.error)}`);
  }

  return data.products || [];
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting price update cron job...");

    // Get all active products
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, amazon_asin, name")
      .eq("is_active", true)
      .not("amazon_asin", "is", null);

    if (fetchError) throw fetchError;
    if (!products || products.length === 0) {
      return NextResponse.json({ message: "No products to update" });
    }

    console.log(`Found ${products.length} products to update`);

    // Get ASINs and fetch from Keepa (batch of 100 max)
    const asins = products.map((p) => p.amazon_asin!);
    const batches = [];
    for (let i = 0; i < asins.length; i += 100) {
      batches.push(asins.slice(i, i + 100));
    }

    let updated = 0;
    let failed = 0;

    for (const batch of batches) {
      const keepaProducts = await fetchFromKeepa(batch);

      for (const keepaProduct of keepaProducts) {
        const product = products.find((p) => p.amazon_asin === keepaProduct.asin);
        if (!product) continue;

        // Get current price from Amazon or New price history
        const amazonPrice = getCurrentPrice(keepaProduct.csv?.[0]);
        const newPrice = getCurrentPrice(keepaProduct.csv?.[1]);
        const currentPrice = amazonPrice || newPrice;

        if (!currentPrice) {
          console.log(`No price found for ${keepaProduct.asin}`);
          failed++;
          continue;
        }

        // Get the latest price record for original_price and previous_price
        const { data: latestPrice } = await supabase
          .from("prices")
          .select("original_price, current_price")
          .eq("product_id", product.id)
          .order("checked_at", { ascending: false })
          .limit(1)
          .single();

        const originalPrice = latestPrice?.original_price || currentPrice;
        const previousPrice = latestPrice?.current_price || null;

        // Calculate price metrics from Keepa history
        const priceHistory = keepaProduct.csv?.[0] || keepaProduct.csv?.[1];
        const allTimeLow = getAllTimeLow(priceHistory);
        const low90d = getLowestInDays(priceHistory, 90);
        const low30d = getLowestInDays(priceHistory, 30);

        // Insert new price record
        const { error: insertError } = await supabase.from("prices").insert({
          product_id: product.id,
          original_price: originalPrice,
          current_price: currentPrice,
          all_time_low: allTimeLow,
          low_90d: low90d,
          low_30d: low30d,
          previous_price: previousPrice,
        });

        if (insertError) {
          console.error(`Error updating price for ${product.amazon_asin}:`, insertError);
          failed++;
        } else {
          console.log(`Updated ${product.amazon_asin}: $${currentPrice}`);
          updated++;
        }
      }

      // Rate limit: wait between batches
      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Price update complete. Updated: ${updated}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: products.length,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
