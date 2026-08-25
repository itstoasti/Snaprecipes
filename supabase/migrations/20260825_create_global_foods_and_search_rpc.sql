-- Enable pg_trgm extension for fast trigram and typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create global_foods community database table
CREATE TABLE IF NOT EXISTS global_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_name TEXT NOT NULL,
    food_name_lower TEXT NOT NULL,
    brand TEXT,
    brand_lower TEXT,
    serving_size TEXT NOT NULL DEFAULT '1 serving',
    calories NUMERIC NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    sugar NUMERIC,
    fiber NUMERIC,
    sodium NUMERIC,
    barcode TEXT,
    source TEXT NOT NULL DEFAULT 'community',
    lookup_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigram GIN indexes for fast fuzzy searching
CREATE INDEX IF NOT EXISTS idx_global_foods_name_trgm ON global_foods USING gin (food_name_lower gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_global_foods_brand_trgm ON global_foods USING gin (brand_lower gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_global_foods_combined_trgm ON global_foods USING gin ((food_name_lower || ' ' || coalesce(brand_lower, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_global_foods_barcode ON global_foods (barcode);
CREATE INDEX IF NOT EXISTS idx_global_foods_lookup_count ON global_foods (lookup_count DESC);

-- Enable RLS
ALTER TABLE global_foods ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone can read global_foods
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'global_foods' AND policyname = 'Anyone can read global foods'
    ) THEN
        CREATE POLICY "Anyone can read global foods"
        ON global_foods FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- Service role policy: Service role has full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'global_foods' AND policyname = 'Service role can manage global foods'
    ) THEN
        CREATE POLICY "Service role can manage global foods"
        ON global_foods FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- RPC: Fast Trigram & Word-Similarity Ranked Search for Global Foods
CREATE OR REPLACE FUNCTION search_global_foods(query_text text, max_results int DEFAULT 15)
RETURNS TABLE (
    id UUID,
    food_name TEXT,
    brand TEXT,
    serving_size TEXT,
    calories NUMERIC,
    protein NUMERIC,
    fat NUMERIC,
    carbs NUMERIC,
    sugar NUMERIC,
    fiber NUMERIC,
    sodium NUMERIC,
    barcode TEXT,
    source TEXT,
    lookup_count INT,
    rank_score REAL
) AS $$
DECLARE
    clean_q text := lower(trim(query_text));
BEGIN
    RETURN QUERY
    SELECT 
        gf.id,
        gf.food_name,
        gf.brand,
        gf.serving_size,
        gf.calories,
        gf.protein,
        gf.fat,
        gf.carbs,
        gf.sugar,
        gf.fiber,
        gf.sodium,
        gf.barcode,
        gf.source,
        gf.lookup_count,
        (
            -- Exact match boost
            CASE 
                WHEN gf.food_name_lower = clean_q THEN 2.0
                WHEN gf.food_name_lower LIKE (clean_q || '%') THEN 1.5
                WHEN (gf.food_name_lower || ' ' || coalesce(gf.brand_lower, '')) LIKE ('%' || clean_q || '%') THEN 1.2
                ELSE 0.5
            END
            * 
            -- Trigram similarity
            greatest(
                similarity(gf.food_name_lower, clean_q),
                similarity(gf.food_name_lower || ' ' || coalesce(gf.brand_lower, ''), clean_q),
                word_similarity(clean_q, gf.food_name_lower || ' ' || coalesce(gf.brand_lower, ''))
            )
            *
            -- Popularity multiplier
            (1.0 + (ln(greatest(gf.lookup_count, 1) + 1.0) * 0.1))
        )::REAL AS rank_score
    FROM global_foods gf
    WHERE 
        clean_q <% (gf.food_name_lower || ' ' || coalesce(gf.brand_lower, ''))
        OR gf.food_name_lower ILIKE ('%' || clean_q || '%')
        OR coalesce(gf.brand_lower, '') ILIKE ('%' || clean_q || '%')
        OR similarity(gf.food_name_lower, clean_q) > 0.2
    ORDER BY rank_score DESC, gf.lookup_count DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Upsert food from barcode/scan/AI into global_foods
CREATE OR REPLACE FUNCTION upsert_global_food(
    p_food_name text,
    p_brand text DEFAULT NULL,
    p_serving_size text DEFAULT '1 serving',
    p_calories numeric DEFAULT 0,
    p_protein numeric DEFAULT 0,
    p_fat numeric DEFAULT 0,
    p_carbs numeric DEFAULT 0,
    p_sugar numeric DEFAULT NULL,
    p_fiber numeric DEFAULT NULL,
    p_sodium numeric DEFAULT NULL,
    p_barcode text DEFAULT NULL,
    p_source text DEFAULT 'community'
)
RETURNS UUID AS $$
DECLARE
    v_food_name_lower text := lower(trim(p_food_name));
    v_brand_lower text := lower(trim(coalesce(p_brand, '')));
    v_id UUID;
BEGIN
    IF v_food_name_lower = '' THEN
        RETURN NULL;
    END IF;

    -- Look for existing record by food_name_lower + brand_lower OR by barcode
    SELECT id INTO v_id FROM global_foods 
    WHERE (barcode IS NOT NULL AND p_barcode IS NOT NULL AND barcode = trim(p_barcode))
       OR (food_name_lower = v_food_name_lower AND coalesce(brand_lower, '') = v_brand_lower)
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        UPDATE global_foods
        SET 
            lookup_count = lookup_count + 1,
            barcode = coalesce(nullif(trim(p_barcode), ''), barcode),
            serving_size = coalesce(nullif(trim(p_serving_size), ''), serving_size),
            calories = CASE WHEN calories = 0 THEN coalesce(p_calories, 0) ELSE calories END,
            protein = CASE WHEN protein = 0 THEN coalesce(p_protein, 0) ELSE protein END,
            fat = CASE WHEN fat = 0 THEN coalesce(p_fat, 0) ELSE fat END,
            carbs = CASE WHEN carbs = 0 THEN coalesce(p_carbs, 0) ELSE carbs END,
            sugar = coalesce(p_sugar, sugar),
            fiber = coalesce(p_fiber, fiber),
            sodium = coalesce(p_sodium, sodium),
            updated_at = now()
        WHERE id = v_id;
    ELSE
        INSERT INTO global_foods (
            food_name,
            food_name_lower,
            brand,
            brand_lower,
            serving_size,
            calories,
            protein,
            fat,
            carbs,
            sugar,
            fiber,
            sodium,
            barcode,
            source,
            lookup_count,
            created_at,
            updated_at
        )
        VALUES (
            trim(p_food_name),
            v_food_name_lower,
            nullif(trim(p_brand), ''),
            nullif(v_brand_lower, ''),
            coalesce(nullif(trim(p_serving_size), ''), '1 serving'),
            coalesce(p_calories, 0),
            coalesce(p_protein, 0),
            coalesce(p_fat, 0),
            coalesce(p_carbs, 0),
            p_sugar,
            p_fiber,
            p_sodium,
            nullif(trim(p_barcode), ''),
            coalesce(p_source, 'community'),
            1,
            now(),
            now()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Increment lookup count for a global food item
CREATE OR REPLACE FUNCTION increment_food_lookup_count(food_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE global_foods SET lookup_count = lookup_count + 1, updated_at = now() WHERE id = food_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
