-- Add price metric columns to prices table for signal labels
ALTER TABLE prices
ADD COLUMN IF NOT EXISTS all_time_low DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS low_90d DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS low_30d DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2);

-- Add comment explaining the columns
COMMENT ON COLUMN prices.all_time_low IS 'Historical lowest price ever recorded';
COMMENT ON COLUMN prices.low_90d IS 'Lowest price in the last 90 days';
COMMENT ON COLUMN prices.low_30d IS 'Lowest price in the last 30 days';
COMMENT ON COLUMN prices.previous_price IS 'Price from the previous check (for detecting recent drops)';
