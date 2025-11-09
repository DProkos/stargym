-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  payment_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  paid_at TIMESTAMPTZ
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create service packages table
CREATE TABLE public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_months INTEGER,
  sessions_included INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create invoice settings table
CREATE TABLE public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Vigor Track',
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_tax_id TEXT,
  company_logo_url TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 24,
  default_payment_terms TEXT DEFAULT 'Payment due within 30 days',
  footer_text TEXT,
  bank_details TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.invoice_settings (
  company_name,
  company_address,
  company_phone,
  company_email,
  invoice_prefix,
  default_tax_rate,
  default_payment_terms,
  footer_text
) VALUES (
  'Vigor Track Gym',
  'Athens, Greece',
  '+30 210 123 4567',
  'info@vigortrack.com',
  'INV',
  24,
  'Payment due within 30 days',
  'Thank you for your business!'
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Admins can manage all invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = customer_id);

-- RLS Policies for invoice_items
CREATE POLICY "Admins can manage invoice items"
  ON public.invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Customers can view their invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.customer_id = auth.uid()
    )
  );

-- RLS Policies for service_packages
CREATE POLICY "Admins can manage packages"
  ON public.service_packages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active packages"
  ON public.service_packages FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for invoice_settings
CREATE POLICY "Admins can manage settings"
  ON public.invoice_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Create function to generate next invoice number
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

-- Create trigger for updating updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();