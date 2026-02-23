export type Product = {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
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
};

export type Click = {
  id: string;
  product_id: string;
  partner_site: string | null;
  clicked_at: string;
};

// Combined type for deals (product + latest price)
export type Deal = Product & {
  original_price: number;
  current_price: number;
  discount_percent: number;
  checked_at: string;
};
