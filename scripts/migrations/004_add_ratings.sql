-- Add rating columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS review_count INTEGER;

-- Add comments
COMMENT ON COLUMN products.rating IS 'Product rating out of 5 (e.g., 4.5)';
COMMENT ON COLUMN products.review_count IS 'Number of reviews';
