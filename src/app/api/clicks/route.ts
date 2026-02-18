import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { product_id, partner_site } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: "product_id required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("clicks").insert({
      product_id,
      partner_site: partner_site || null,
    });

    if (error) {
      console.error("Error tracking click:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
