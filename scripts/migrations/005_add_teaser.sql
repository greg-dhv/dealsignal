-- Add teaser column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS teaser TEXT;

-- Add comment
COMMENT ON COLUMN products.teaser IS 'Short 2-line product teaser with key specs (AI-generated)';
