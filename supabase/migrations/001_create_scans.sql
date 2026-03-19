-- OmniDevX Scanner — initial schema
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scans (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  value       TEXT        NOT NULL,
  type        TEXT        NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  device_info JSONB       DEFAULT '{}'::jsonb
);

-- Index for fast timestamp-ordered queries
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp DESC);

-- Index for full-text search on value
CREATE INDEX IF NOT EXISTS idx_scans_value_gin ON scans USING gin(to_tsvector('english', value));

-- Enable Row Level Security
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust per your auth requirements)
CREATE POLICY "Allow all operations" ON scans
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE scans;
