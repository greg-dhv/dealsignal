import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateRegions() {
  console.log("Updating all products to region: US...\n");

  const { data, error } = await supabase
    .from("products")
    .update({ region: "US" })
    .is("region", null)
    .select("id");

  if (error) {
    console.error("Error updating regions:", error);
    return;
  }

  console.log(`Updated ${data?.length || 0} products with region: US`);
}

updateRegions();
