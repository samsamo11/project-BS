-- B.S Evaluation - Supabase Storage Setup
-- Run this in Supabase SQL Editor to create the storage bucket for images

-- Create storage bucket for evaluation images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bs-evaluation-images',
  'bs-evaluation-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies - Allow authenticated uploads (using service role)
-- Note: Since we use the anon key with service role, policies are bypassed.
-- If using RLS, add these policies:

-- Allow anyone to read images (public bucket)
-- CREATE POLICY "Public read access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'bs-evaluation-images');

-- Allow authenticated users to upload
-- CREATE POLICY "Authenticated upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'bs-evaluation-images');

-- Allow authenticated users to delete their own images
-- CREATE POLICY "Authenticated delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'bs-evaluation-images');
