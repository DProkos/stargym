-- Create storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-images',
  'cms-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for admin access
CREATE POLICY "Admins can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cms-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cms-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cms-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cms-images');