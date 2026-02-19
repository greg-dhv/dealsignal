import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

// Configuration
const KEEPA_API_KEY = "8eu8vlvvp5ho0v18jtgjfcvoou02au4iicv72ij6ub5bgdohcbr1qc8493bi1k9p";
const AMAZON_TAG = "wzstats-20";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ASINs to import
const ASINS = [
  "B0FD6697KT", "B0CJVQFZ1S", "B0CQKKHT5J", "B0DB6S6R89", "B0DB6QT8K6",
  "B0B789CGGQ", "B0DTB3F17W", "B0FD41XC3P", "B0CQKKHT5J", "B0F8B7VFB1",
  "B0CQKL4YTB", "B0BSYFB99D", "B0F3QDLZKG", "B0F3QKLDLM", "B0FDP42BTF",
  "B08141GQQG", "B0DNTLYK6Z", "B0FRP6CMZ5", "B0DFX4TPS6", "B0F94KTF6C",
  "B0FH5YWH7B", "B0CYWFH5Y9", "B0DBB38QK1", "B0DB9LQ7R5", "B0FHHNQ4Y1",
  "B0CZPLQZ8P", "B0FNQDNGXY", "B09DCBJWDB", "B0CR45VFTG", "B0D9YK6K68",
  "B0FW3MQHQ9", "B0F1MPPJJQ", "B0BLJLP7FM", "B0FQNQ76JY", "B0F21TVZ8V",
  "B0FW3MQHQ9", "B0CZNNFBCW", "B0DSZX1BH7", "B0FPFC4FQK", "B0CXPM1HH1",
  "B0F66KXN58", "B0CCVFFJ6Z", "B0D7CMT384", "B0DSZSTWQZ", "B0CZNPC87C",
  "B0FFTFYGLV", "B0CSJPDYDN", "B09V1KJ3J4", "B0FFTFYGLV", "B0CPFWXMBL"
];

// Remove duplicates
const uniqueASINs = [...new Set(ASINS)];

// Category mapping based on common gaming product keywords
function detectCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("mouse") || lower.includes("mice")) return "mice";
  if (lower.includes("keyboard")) return "keyboards";
  if (lower.includes("headset") || lower.includes("headphone")) return "headsets";
  if (lower.includes("monitor") || lower.includes("display")) return "monitors";
  if (lower.includes("chair")) return "chairs";
  if (lower.includes("controller") || lower.includes("gamepad")) return "controllers";
  if (lower.includes("mousepad") || lower.includes("mouse pad") || lower.includes("desk mat")) return "mousepads";
  if (lower.includes("microphone") || lower.includes("mic")) return "microphones";
  if (lower.includes("webcam") || lower.includes("camera")) return "webcams";
  if (lower.includes("glasses")) return "gaming glasses";
  return "accessories";
}

// Keepa price is in cents, -1 means unavailable
function keepaPriceToUSD(price: number): number | null {
  if (price < 0) return null;
  return price / 100;
}

// Get average price from Keepa price history (last 90 days)
function getAveragePrice(priceHistory: number[] | null): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;

  // Keepa format: [time1, price1, time2, price2, ...]
  // Get last 90 days of prices
  const now = Date.now();
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
  const keepaTimeOffset = 21564000; // Keepa epoch offset in minutes

  const prices: number[] = [];
  for (let i = 0; i < priceHistory.length; i += 2) {
    const keepaTime = priceHistory[i];
    const price = priceHistory[i + 1];
    const timestamp = (keepaTime + keepaTimeOffset) * 60 * 1000;

    if (timestamp >= ninetyDaysAgo && price > 0) {
      prices.push(price / 100);
    }
  }

  if (prices.length === 0) return null;
  return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
}

// Get current price from Keepa price history
function getCurrentPrice(priceHistory: number[] | null): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;

  // Last price in the array
  for (let i = priceHistory.length - 1; i >= 1; i -= 2) {
    const price = priceHistory[i];
    if (price > 0) {
      return price / 100;
    }
  }
  return null;
}

// Build Amazon image URL from Keepa image code
function buildImageUrl(imagesCSV: string | null): string | null {
  if (!imagesCSV) return null;
  const images = imagesCSV.split(",");
  if (images.length === 0) return null;
  // Keepa image format: first part is the image code
  const imageCode = images[0];
  return `https://m.media-amazon.com/images/I/${imageCode}`;
}

// Fetch products from Keepa API (batch of up to 100)
async function fetchFromKeepa(asins: string[]): Promise<any[]> {
  const asinString = asins.join(",");
  const url = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asinString}&stats=90`;

  console.log(`Fetching ${asins.length} products from Keepa...`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Keepa API error: ${JSON.stringify(data.error)}`);
  }

  return data.products || [];
}

// Main import function
async function importProducts() {
  console.log("Starting import...");
  console.log(`Found ${uniqueASINs.length} unique ASINs`);

  // Initialize Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch from Keepa
  const products = await fetchFromKeepa(uniqueASINs);
  console.log(`Received ${products.length} products from Keepa`);

  let imported = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      const asin = product.asin;
      const title = product.title;

      if (!title) {
        console.log(`Skipping ${asin}: no title`);
        skipped++;
        continue;
      }

      // Get prices from Amazon price history (index 0 in csv array)
      const amazonPriceHistory = product.csv?.[0] || null;
      const currentPrice = getCurrentPrice(amazonPriceHistory);
      const avgPrice = getAveragePrice(amazonPriceHistory);

      // Also check "new" prices (index 1) if Amazon price not available
      const newPriceHistory = product.csv?.[1] || null;
      const currentPriceNew = getCurrentPrice(newPriceHistory);
      const avgPriceNew = getAveragePrice(newPriceHistory);

      const finalCurrentPrice = currentPrice || currentPriceNew;
      const finalAvgPrice = avgPrice || avgPriceNew;

      if (!finalCurrentPrice) {
        console.log(`Skipping ${asin} (${title.substring(0, 40)}...): no price data`);
        skipped++;
        continue;
      }

      const category = detectCategory(title);
      const imageUrl = buildImageUrl(product.imagesCSV);
      const affiliateUrl = `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;

      // Insert into products table
      const { data: productData, error: productError } = await supabase
        .from("products")
        .upsert({
          amazon_asin: asin,
          name: title,
          category: category,
          image_url: imageUrl,
          affiliate_url: affiliateUrl,
          is_active: true,
        }, { onConflict: "amazon_asin" })
        .select()
        .single();

      if (productError) {
        console.error(`Error inserting product ${asin}:`, productError);
        skipped++;
        continue;
      }

      // Insert into prices table
      const originalPrice = finalAvgPrice || finalCurrentPrice;

      const { error: priceError } = await supabase
        .from("prices")
        .insert({
          product_id: productData.id,
          original_price: originalPrice,
          current_price: finalCurrentPrice,
        });

      if (priceError) {
        console.error(`Error inserting price for ${asin}:`, priceError);
      }

      console.log(`✓ ${title.substring(0, 50)}... | $${finalCurrentPrice} (avg: $${originalPrice}) | ${category}`);
      imported++;

    } catch (err) {
      console.error(`Error processing product:`, err);
      skipped++;
    }
  }

  console.log("\n--- Import Complete ---");
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
}

// Run
importProducts().catch(console.error);
