import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type Platform = "PC" | "Xbox" | "PS5";

// Detect platforms from product title
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
    // These categories are typically PC-only
    const pcCategories = ["mice", "keyboards", "monitors", "mousepads", "gaming glasses"];
    if (pcCategories.includes(category)) {
      platforms.push("PC");
    }
    // These categories work across all platforms
    const allPlatformCategories = ["headsets", "controllers", "microphones", "webcams", "chairs"];
    if (allPlatformCategories.includes(category)) {
      platforms.push("PC", "Xbox", "PS5");
    }
  }

  return platforms;
}

async function updatePlatforms() {
  console.log("Fetching all products...");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category, platforms");

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  console.log(`Found ${products.length} products\n`);

  let updated = 0;
  for (const product of products) {
    const platforms = detectPlatforms(product.name, product.category);

    const { error: updateError } = await supabase
      .from("products")
      .update({ platforms })
      .eq("id", product.id);

    if (updateError) {
      console.error(`Error updating ${product.name}:`, updateError);
    } else {
      console.log(`✓ ${product.name.substring(0, 50)}... → [${platforms.join(", ")}]`);
      updated++;
    }
  }

  console.log(`\nUpdated ${updated}/${products.length} products with platform info.`);
}

updatePlatforms();
