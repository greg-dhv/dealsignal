import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local
config({ path: ".env.local" });

// Configuration
const KEEPA_API_KEY = "8eu8vlvvp5ho0v18jtgjfcvoou02au4iicv72ij6ub5bgdohcbr1qc8493bi1k9p";
const AMAZON_TAG = "wzstats-20";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// Initialize Anthropic client
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ASINs to import
const ASINS = [
  "B0FSWTF7RY", "B0CTJ5F2FB", "B00N1YPXW2", "B0FRFZ9M66", "B0CWNJ7W12",
  "B0C47ZX1WB", "B0F6JWQQB6", "B0DZCSBCLF", "B0G2LY516S", "B0FLVK4MT3",
  "B0F1HX3WXX", "B0F1J1JTKP", "B0FH5YWH7B", "B0GCZNDC82", "B0CZX7MB48",
  "B0FKB4RDTX", "B0B55T9RTP", "B08M3WY4RV"
];

// Remove duplicates
const uniqueASINs = [...new Set(ASINS)];

// Generate a clean display name using Claude
async function generateDisplayName(title: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Convert this Amazon product title into a short, clean display name (2-5 words max). Keep brand name and key product identifier. No descriptions, no features, no "for gaming" etc.

Title: "${title}"

Reply with ONLY the display name, nothing else.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text.trim();
    }
    return title.split(/[,:\-–]/).at(0)?.trim() || title;
  } catch (err) {
    console.error("Error generating display name:", err);
    // Fallback to simple heuristic
    return title.split(/[,:\-–]/).at(0)?.trim() || title;
  }
}

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

      // Generate clean display name
      const displayName = await generateDisplayName(title);

      // Insert into products table
      const { data: productData, error: productError } = await supabase
        .from("products")
        .upsert({
          amazon_asin: asin,
          name: title,
          display_name: displayName,
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

      console.log(`✓ ${displayName} | $${finalCurrentPrice} (avg: $${originalPrice}) | ${category}`);
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
