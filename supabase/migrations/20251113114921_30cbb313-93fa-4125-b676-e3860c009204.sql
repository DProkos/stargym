-- Add brand color to invoice settings
ALTER TABLE public.invoice_settings 
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#667eea';

COMMENT ON COLUMN public.invoice_settings.brand_color IS 'Primary brand color for PDF invoices (hex format)';