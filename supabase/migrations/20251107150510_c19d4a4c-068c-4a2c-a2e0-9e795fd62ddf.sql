-- Create storage bucket for template images
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for template images storage
CREATE POLICY "Public Access for template images"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-images');

CREATE POLICY "Authenticated users can upload template images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'template-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their template images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'template-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their template images"
ON storage.objects FOR DELETE
USING (bucket_id = 'template-images' AND auth.role() = 'authenticated');