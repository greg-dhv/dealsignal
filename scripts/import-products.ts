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
  "B08M3DLCW1", "B095KZMGHD", "B08M3S3VPY", "B086PKMZ21"
];

// Remove duplicates
const uniqueASINs = [...new Set(ASINS)];

// Generate a clean display name using Claude
async function generateDisplayName(title: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
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

// Generate a short teaser with key specs using Claude
async function generateTeaser(title: string, features: string[] | null): Promise<string | null> {
  try {
    const featuresText = features?.length ? features.slice(0, 5).join("\n- ") : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Extract 2-4 key specs/features from this gaming product. Format as short bullet points separated by " • " (bullet point symbol). Focus on: performance specs, connectivity, compatibility, standout features. Max 60 characters total.

Title: "${title}"
${featuresText ? `\nFeatures:\n- ${featuresText}` : ""}

Reply with ONLY the specs like: "7.1 Surround • 50mm Drivers • Wireless"`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text.trim();
    }
    return null;
  } catch (err) {
    console.error("Error generating teaser:", err);
    return null;
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

// Detect platforms from product title
type Platform = "PC" | "Xbox" | "PS5";

function detectPlatforms(title: string, category: string): Platform[] {
  const lower = title.toLowerCase();
  const platforms: Platform[] = [];

  // Check for Xbox
  if (lower.includes("xbox") || lower.includes("xsx") || lower.includes("series x") || lower.includes("series s")) {
    platforms.push("Xbox");
  }

  // Check for PlayStation
  if (lower.includes("ps5") || lower.includes("ps4") || lower.includes("playstation") || lower.includes("dualsense")) {
    platforms.push("PS5");
  }

  // Check for PC
  if (lower.includes(" pc") || lower.includes("pc ") || lower.includes("/pc") || lower.includes("pc/") ||
      lower.includes("windows") || lower.includes("usb") || lower.includes("wired")) {
    platforms.push("PC");
  }

  // If no platform detected, infer from category
  if (platforms.length === 0) {
    // These categories are typically PC-compatible
    const pcCategories = ["mice", "keyboards", "monitors", "mousepads", "microphones", "webcams", "chairs", "gaming glasses"];
    if (pcCategories.includes(category)) {
      platforms.push("PC");
    }
    // Headsets and controllers could be any platform, default to all
    if (category === "headsets" || category === "controllers") {
      platforms.push("PC", "Xbox", "PS5");
    }
  }

  return platforms;
}

// Keepa price is in cents, -1 means unavailable
function keepaPriceToUSD(price: number): number | null {
  if (price < 0) return null;
  return price / 100;
}

// Keepa time offset (minutes since Keepa epoch)
const KEEPA_TIME_OFFSET = 21564000;

// Convert Keepa timestamp to JS timestamp
function keepaTimeToTimestamp(keepaTime: number): number {
  return (keepaTime + KEEPA_TIME_OFFSET) * 60 * 1000;
}

// Get average price from Keepa price history (last 90 days)
function getAveragePrice(priceHistory: number[] | null): number | null {
  if (!priceHistory || priceHistory.length < 2) return null;

  const now = Date.now();
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

  const prices: number[] = [];
  for (let i = 0; i < priceHistory.length; i += 2) {
    const keepaTime = priceHistory[i];
    const price = priceHistory[i + 1];
    const timestamp = keepaTimeToTimestamp(keepaTime);

    if (timestamp >= ninetyDaysAgo && price > 0) {
      prices.push(price / 100);
    }
  }

  if (prices.length === 0) return null;
  return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
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
  const url = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asinString}&stats=90&rating=1`;

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
      const priceHistory = amazonPriceHistory || newPriceHistory;

      // Calculate price metrics for signal labels
      const allTimeLow = getAllTimeLow(priceHistory);
      const low90d = getLowestInDays(priceHistory, 90);
      const low30d = getLowestInDays(priceHistory, 30);

      if (!finalCurrentPrice) {
        console.log(`Skipping ${asin} (${title.substring(0, 40)}...): no price data`);
        skipped++;
        continue;
      }

      const category = detectCategory(title);
      const platforms = detectPlatforms(title, category);
      const imageUrl = buildImageUrl(product.imagesCSV);
      const affiliateUrl = `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;

      // Generate clean display name and teaser
      const displayName = await generateDisplayName(title);
      const teaser = await generateTeaser(title, product.features || null);

      // Extract rating and review count
      // Try stats.current first, then fall back to csv arrays
      let rawRating = product.stats?.current?.[16];
      let rawReviewCount = product.stats?.current?.[17];

      // If stats doesn't have it, try getting last value from csv arrays
      if ((!rawRating || rawRating < 0) && product.csv?.[16]?.length >= 2) {
        const ratingHistory = product.csv[16];
        for (let i = ratingHistory.length - 1; i >= 1; i -= 2) {
          if (ratingHistory[i] > 0) {
            rawRating = ratingHistory[i];
            break;
          }
        }
      }
      if ((!rawReviewCount || rawReviewCount < 0) && product.csv?.[17]?.length >= 2) {
        const reviewHistory = product.csv[17];
        for (let i = reviewHistory.length - 1; i >= 1; i -= 2) {
          if (reviewHistory[i] > 0) {
            rawReviewCount = reviewHistory[i];
            break;
          }
        }
      }

      const rating = rawRating && rawRating > 0 ? rawRating / 10 : null;
      const reviewCount = rawReviewCount && rawReviewCount > 0 ? rawReviewCount : null;

      // Insert into products table
      const { data: productData, error: productError } = await supabase
        .from("products")
        .upsert({
          amazon_asin: asin,
          name: title,
          display_name: displayName,
          teaser: teaser,
          category: category,
          platforms: platforms,
          retailer: "Amazon US",
          rating: rating,
          review_count: reviewCount,
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
          all_time_low: allTimeLow,
          low_90d: low90d,
          low_30d: low30d,
          previous_price: null, // First import, no previous price
        });

      if (priceError) {
        console.error(`Error inserting price for ${asin}:`, priceError);
      }

      // Determine signal label for logging
      let signal = "";
      if (allTimeLow && finalCurrentPrice <= allTimeLow) signal = " 🔥 HISTORICAL LOW";
      else if (low90d && finalCurrentPrice <= low90d) signal = " ⭐ 90-DAY LOW";
      else if (low30d && finalCurrentPrice <= low30d) signal = " 📉 30-DAY LOW";

      const ratingStr = rating ? `★${rating}` : "";
      console.log(`✓ ${displayName} | $${finalCurrentPrice} | ${ratingStr}${signal}`);
      if (teaser) console.log(`  → ${teaser}`);
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
