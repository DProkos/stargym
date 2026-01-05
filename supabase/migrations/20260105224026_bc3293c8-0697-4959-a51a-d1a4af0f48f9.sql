-- Fix 1: Add admin role check to generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_row invoice_settings%ROWTYPE;
  new_number INTEGER;
  invoice_num TEXT;
BEGIN
  -- Check if user has admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Get current settings
  SELECT * INTO settings_row FROM invoice_settings LIMIT 1;
  
  -- Get next number
  new_number := settings_row.next_invoice_number;
  
  -- Update next number
  UPDATE invoice_settings 
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = settings_row.id;
  
  -- Format invoice number
  invoice_num := settings_row.invoice_prefix || '-' || LPAD(new_number::TEXT, 6, '0');
  
  RETURN invoice_num;
END;
$$;

-- Fix 2: Update template-images storage policies to admin-only
DROP POLICY IF EXISTS "Authenticated users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their template images" ON storage.objects;

CREATE POLICY "Admins can upload template images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'template-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update template images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'template-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete template images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'template-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);