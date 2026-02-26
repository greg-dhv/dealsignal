-- Add platforms column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN products.platforms IS 'Array of supported platforms: PC, Xbox, PS5';

-- Create index for platform filtering
CREATE INDEX IF NOT EXISTS idx_products_platforms ON products USING GIN (platforms);
