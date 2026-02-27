-- Add region column for geo-targeting
ALTER TABLE products ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'US';

-- Update existing products to US (Amazon US)
UPDATE products SET region = 'US' WHERE region IS NULL;
