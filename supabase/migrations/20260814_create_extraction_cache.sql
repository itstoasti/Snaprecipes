-- Extraction result cache: enables sub-second re-import of previously
-- extracted URLs (wired up in the extract-recipe edge function).

CREATE TABLE IF NOT EXISTS extraction_cache (
    url_hash TEXT PRIMARY KEY,
    normalized_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    hits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_cache_normalized_url
    ON extraction_cache (normalized_url);

ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached extractions (dedupe + fast re-import)
CREATE POLICY "Anyone can read extraction cache"
ON extraction_cache FOR SELECT
TO anon, authenticated
USING (true);

-- Writes are performed server-side with the service role key,
-- which bypasses RLS. No insert/update policies are granted to clients.
