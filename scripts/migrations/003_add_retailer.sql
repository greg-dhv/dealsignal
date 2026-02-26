-- Add retailer column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS retailer TEXT DEFAULT 'Amazon US';

-- Add comment explaining the column
COMMENT ON COLUMN products.retailer IS 'Retailer name (e.g., Amazon US, Amazon UK, Best Buy)';

-- Create index for retailer filtering
CREATE INDEX IF NOT EXISTS idx_products_retailer ON products (retailer);
