import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local
config({ path: ".env.local" });

const KEEPA_API_KEY = "8eu8vlvvp5ho0v18jtgjfcvoou02au4iicv72ij6ub5bgdohcbr1qc8493bi1k9p";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Generate teaser using Claude
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

// Fetch from Keepa
async function fetchFromKeepa(asins: string[]): Promise<any[]> {
  const asinString = asins.join(",");
  const url = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asinString}&stats=90&rating=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Keepa API error: ${JSON.stringify(data.error)}`);
  }

  return data.products || [];
}

async function updateTeasers() {
  console.log("Fetching products without teasers...");

  // Get all products without teasers
  const { data: products, error } = await supabase
    .from("products")
    .select("id, amazon_asin, name")
    .is("teaser", null)
    .not("amazon_asin", "is", null);

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  if (!products || products.length === 0) {
    console.log("All products already have teasers!");
    return;
  }

  console.log(`Found ${products.length} products without teasers`);

  // Process in batches of 100 (Keepa limit)
  const batchSize = 100;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const asins = batch.map((p) => p.amazon_asin!);

    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}...`);

    try {
      const keepaProducts = await fetchFromKeepa(asins);

      for (const keepaProduct of keepaProducts) {
        const product = batch.find((p) => p.amazon_asin === keepaProduct.asin);
        if (!product) continue;

        const teaser = await generateTeaser(
          keepaProduct.title || product.name,
          keepaProduct.features || null
        );

        if (teaser) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ teaser })
            .eq("id", product.id);

          if (updateError) {
            console.error(`Error updating ${product.amazon_asin}:`, updateError);
            failed++;
          } else {
            console.log(`✓ ${product.name?.substring(0, 40)}...`);
            console.log(`  → ${teaser}`);
            updated++;
          }
        } else {
          failed++;
        }
      }

      // Rate limit between batches
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error("Batch error:", err);
      failed += batch.length;
    }
  }

  console.log("\n--- Update Complete ---");
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

updateTeasers().catch(console.error);
