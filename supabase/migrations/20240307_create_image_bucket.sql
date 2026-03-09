-- Create a new storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the bucket
-- 1. Allow public to read images
CREATE POLICY "Recipe Image Public Access"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'recipe-images');

-- 2. Allow service role (Edge Functions) to manage all images
CREATE POLICY "Recipe Image Service Role Management"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'recipe-images')
WITH CHECK (bucket_id = 'recipe-images');

-- 3. Allow authenticated users to upload their own images (for manual uploads)
CREATE POLICY "Recipe Image User Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Allow users to update/delete their own images
CREATE POLICY "Recipe Image User Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Recipe Image User Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
