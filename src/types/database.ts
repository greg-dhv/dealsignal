export type Platform = "PC" | "Xbox" | "PS5";

export type Product = {
  id: string;
  name: string;
  display_name: string | null;
  teaser: string | null;
  category: string;
  platforms: Platform[];
  retailer: string;
  rating: number | null;
  review_count: number | null;
  image_url: string | null;
  amazon_asin: string | null;
  affiliate_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Price = {
  id: string;
  product_id: string;
  original_price: number;
  current_price: number;
  discount_percent: number;
  checked_at: string;
  all_time_low: number | null;
  low_90d: number | null;
  low_30d: number | null;
  previous_price: number | null;
};

export type Click = {
  id: string;
  product_id: string;
  partner_site: string | null;
  clicked_at: string;
};

// Signal label type
export type SignalLabel = "historical_low" | "low_90d" | "low_30d" | "recent_drop" | null;

// Combined type for deals (product + latest price)
export type Deal = Product & {
  original_price: number;
  current_price: number;
  discount_percent: number;
  checked_at: string;
  all_time_low: number | null;
  low_90d: number | null;
  low_30d: number | null;
  previous_price: number | null;
  signal_label: SignalLabel;
};
