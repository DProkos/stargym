#!/bin/bash

# =============================================================================
# Vigor Track - Ubuntu Self-Hosted Installation Script
# Εγκαθιστά Node.js, Docker, Supabase (self-hosted) και το frontend
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Μην τρέχετε αυτό το script ως root. Χρησιμοποιήστε sudo όταν χρειάζεται."
   exit 1
fi

echo ""
echo "=============================================="
echo "   Vigor Track - Self-Hosted Installation    "
echo "=============================================="
echo ""

# =============================================================================
# Step 1: Update System
# =============================================================================
print_status "Ενημέρωση συστήματος..."
sudo apt-get update && sudo apt-get upgrade -y

# =============================================================================
# Step 2: Install essential packages
# =============================================================================
print_status "Εγκατάσταση βασικών πακέτων..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip

# =============================================================================
# Step 3: Install Node.js (v20 LTS)
# =============================================================================
print_status "Εγκατάσταση Node.js v20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js εγκαταστάθηκε: $(node --version)"
else
    print_warning "Node.js είναι ήδη εγκατεστημένο: $(node --version)"
fi

# =============================================================================
# Step 4: Install Docker
# =============================================================================
print_status "Εγκατάσταση Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add the repository to Apt sources
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker εγκαταστάθηκε: $(docker --version)"
    print_warning "Θα χρειαστεί να κάνετε logout/login για να ενεργοποιηθεί το docker group"
else
    print_warning "Docker είναι ήδη εγκατεστημένο: $(docker --version)"
fi

# =============================================================================
# Step 5: Install Supabase CLI
# =============================================================================
print_status "Εγκατάσταση Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    # Download and install Supabase CLI
    curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/scripts/install.sh | sudo bash
    print_success "Supabase CLI εγκαταστάθηκε: $(supabase --version)"
else
    print_warning "Supabase CLI είναι ήδη εγκατεστημένο: $(supabase --version)"
fi

# =============================================================================
# Step 6: Create project directory
# =============================================================================
PROJECT_DIR="$HOME/vigor-track"
print_status "Δημιουργία φακέλου project στο $PROJECT_DIR..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# =============================================================================
# Step 7: Initialize Supabase project
# =============================================================================
print_status "Αρχικοποίηση Supabase project..."
if [ ! -f "supabase/config.toml" ]; then
    supabase init
    print_success "Supabase project αρχικοποιήθηκε"
else
    print_warning "Supabase project υπάρχει ήδη"
fi

# =============================================================================
# Step 8: Create database migrations
# =============================================================================
print_status "Δημιουργία database migrations..."

mkdir -p supabase/migrations

# Main migration file with all tables
cat > supabase/migrations/20240101000000_initial_schema.sql << 'EOFMIGRATION'
-- =============================================================================
-- Vigor Track - Initial Database Schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'trainer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- User Roles Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- =============================================================================
-- Profiles Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    customer_status TEXT DEFAULT 'active',
    acquisition_source TEXT,
    notes_summary TEXT,
    lifetime_value NUMERIC DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    last_booking_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- App Settings Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
    ('signup_enabled', 'true', 'Allow new user registrations'),
    ('gym_name', 'Vigor Track', 'Gym name'),
    ('contact_email', 'info@vigortrack.com', 'Contact email')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================================
-- Trainers Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bio TEXT,
    specialization TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Classes Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trainer_id UUID REFERENCES public.trainers(id),
    duration_minutes INTEGER NOT NULL,
    max_capacity INTEGER DEFAULT 20,
    day_of_week INTEGER NOT NULL,
    time TIME NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Bookings Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    class_id UUID REFERENCES public.classes(id),
    booking_date DATE NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Waitlist Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    class_id UUID REFERENCES public.classes(id),
    booking_date DATE NOT NULL,
    position INTEGER NOT NULL,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Membership Tiers Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.membership_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    duration_months INTEGER DEFAULT 1,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- User Subscriptions Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tier_id UUID REFERENCES public.membership_tiers(id),
    status TEXT DEFAULT 'active',
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Service Packages Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    duration_months INTEGER,
    sessions_included INTEGER,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Invoice Settings Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT DEFAULT 'Vigor Track',
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    company_tax_id TEXT,
    company_logo_url TEXT,
    invoice_prefix TEXT DEFAULT 'INV',
    next_invoice_number INTEGER DEFAULT 1,
    default_tax_rate NUMERIC DEFAULT 24,
    default_payment_terms TEXT DEFAULT 'Payment due within 30 days',
    bank_details TEXT,
    footer_text TEXT,
    brand_color TEXT DEFAULT '#667eea',
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- Insert default invoice settings
INSERT INTO public.invoice_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- =============================================================================
-- Invoices Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    status TEXT DEFAULT 'draft',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    payment_terms TEXT,
    paid_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Invoice Items Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- =============================================================================
-- Newsletter Subscribers Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    subscribed BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Newsletter Campaigns Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    status TEXT DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    sent_count INTEGER DEFAULT 0,
    tracking_id TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Email Events Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.newsletter_campaigns(id),
    subscriber_email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Email Templates Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    html_template TEXT NOT NULL,
    thumbnail_url TEXT,
    is_system BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- CRM Tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    tag_id UUID REFERENCES public.customer_tags(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    interaction_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    total_runs INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.crm_workflows(id),
    customer_id UUID NOT NULL,
    status TEXT NOT NULL,
    executed_actions JSONB DEFAULT '[]',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Admin Activity Log Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    target_user_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Site Settings Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'text',
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Content Blocks Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    title TEXT,
    content TEXT,
    image_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Page Sections Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key TEXT NOT NULL,
    section_key TEXT NOT NULL,
    section_type TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    content TEXT,
    image_url TEXT,
    background_color TEXT DEFAULT 'default',
    text_color TEXT DEFAULT 'default',
    settings JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    title_en TEXT,
    title_el TEXT,
    subtitle_en TEXT,
    subtitle_el TEXT,
    content_en TEXT,
    content_el TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Class Status Changes Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.class_status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT,
    affected_date DATE,
    changed_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Password Change Codes Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.password_change_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    code TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Email Verification Codes Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
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
  SELECT * INTO settings_row FROM invoice_settings LIMIT 1;
  new_number := settings_row.next_invoice_number;
  UPDATE invoice_settings 
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = settings_row.id;
  invoice_num := settings_row.invoice_prefix || '-' || LPAD(new_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- Function to assign waitlist position
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1
  INTO NEW.position
  FROM public.waitlist
  WHERE class_id = NEW.class_id
    AND booking_date = NEW.booking_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_setting TEXT;
BEGIN
  SELECT setting_value INTO signup_setting
  FROM public.app_settings
  WHERE setting_key = 'signup_enabled';
  
  IF signup_setting = 'false' THEN
    RAISE EXCEPTION 'User registration is currently disabled';
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger for waitlist position
DROP TRIGGER IF EXISTS assign_waitlist_position_trigger ON public.waitlist;
CREATE TRIGGER assign_waitlist_position_trigger
BEFORE INSERT ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.assign_waitlist_position();

-- Trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_change_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- App Settings
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Trainers
CREATE POLICY "Anyone can view trainers" ON public.trainers FOR SELECT USING (true);
CREATE POLICY "Admins can manage trainers" ON public.trainers FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Trainers can view their own profile" ON public.trainers FOR SELECT USING (id = auth.uid());
CREATE POLICY "Trainers can update their own profile" ON public.trainers FOR UPDATE USING (id = auth.uid());

-- Classes
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Trainers can manage their own classes" ON public.classes FOR ALL USING (has_role(auth.uid(), 'trainer') AND trainer_id = auth.uid());

-- Bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Trainers can view bookings for their classes" ON public.bookings FOR SELECT USING (has_role(auth.uid(), 'trainer') AND class_id IN (SELECT id FROM classes WHERE trainer_id = auth.uid()));

-- Waitlist
CREATE POLICY "Users can view their own waitlist entries" ON public.waitlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own waitlist entries" ON public.waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own waitlist entries" ON public.waitlist FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all waitlist entries" ON public.waitlist FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Membership Tiers
CREATE POLICY "Anyone can view active membership tiers" ON public.membership_tiers FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage membership tiers" ON public.membership_tiers FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User Subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Service Packages
CREATE POLICY "Anyone can view active packages" ON public.service_packages FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage packages" ON public.service_packages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoice Settings
CREATE POLICY "Admins can manage settings" ON public.invoice_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoices
CREATE POLICY "Customers can view their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoice Items
CREATE POLICY "Customers can view their invoice items" ON public.invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.customer_id = auth.uid()));
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items FOR ALL USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND has_role(auth.uid(), 'admin')));

-- Newsletter Subscribers
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Newsletter Campaigns
CREATE POLICY "Admins can manage all campaigns" ON public.newsletter_campaigns FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Email Events
CREATE POLICY "Allow public insert for tracking" ON public.email_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage email events" ON public.email_events FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Email Templates
CREATE POLICY "Anyone can view templates" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON public.email_templates FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Customer Tags
CREATE POLICY "Admins can manage customer tags" ON public.customer_tags FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Customer Tag Assignments
CREATE POLICY "Customers can view their own tags" ON public.customer_tag_assignments FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage tag assignments" ON public.customer_tag_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CRM Notes
CREATE POLICY "Customers can view their own notes" ON public.crm_notes FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage notes" ON public.crm_notes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CRM Interactions
CREATE POLICY "Customers can view their own interactions" ON public.crm_interactions FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage interactions" ON public.crm_interactions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Customer Segments
CREATE POLICY "Admins can manage segments" ON public.customer_segments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CRM Workflows
CREATE POLICY "Admins can manage workflows" ON public.crm_workflows FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CRM Workflow Executions
CREATE POLICY "Admins can view workflow executions" ON public.crm_workflow_executions FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin Activity Log
CREATE POLICY "Admins can view all activity logs" ON public.admin_activity_log FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Site Settings
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Content Blocks
CREATE POLICY "Anyone can view content blocks" ON public.content_blocks FOR SELECT USING (true);
CREATE POLICY "Admins can manage content blocks" ON public.content_blocks FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Page Sections
CREATE POLICY "Anyone can view visible page sections" ON public.page_sections FOR SELECT USING (is_visible = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage page sections" ON public.page_sections FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Class Status Changes
CREATE POLICY "Trainers can view status changes for their classes" ON public.class_status_changes FOR SELECT USING (has_role(auth.uid(), 'trainer') AND class_id IN (SELECT id FROM classes WHERE trainer_id = auth.uid()));
CREATE POLICY "Trainers can insert status changes for their classes" ON public.class_status_changes FOR INSERT WITH CHECK (has_role(auth.uid(), 'trainer') AND class_id IN (SELECT id FROM classes WHERE trainer_id = auth.uid()));
CREATE POLICY "Admins can manage all status changes" ON public.class_status_changes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Password Change Codes
CREATE POLICY "Users can view their own password change codes" ON public.password_change_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own password change codes" ON public.password_change_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own password change codes" ON public.password_change_codes FOR UPDATE USING (auth.uid() = user_id);

-- Email Verification Codes
CREATE POLICY "Users can view their own verification codes" ON public.email_verification_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own verification codes" ON public.email_verification_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own verification codes" ON public.email_verification_codes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all verification codes" ON public.email_verification_codes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =============================================================================
-- Storage Buckets
-- =============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-images', 'cms-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true) ON CONFLICT DO NOTHING;

EOFMIGRATION

print_success "Database migrations δημιουργήθηκαν"

# =============================================================================
# Step 9: Create .env.example file
# =============================================================================
print_status "Δημιουργία .env.example..."

cat > .env.example << 'EOFENV'
# Supabase Configuration (θα δημιουργηθούν αυτόματα από το supabase start)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=local

# SMTP Configuration (για email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Optional: Stripe (για πληρωμές)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
EOFENV

print_success "Αρχείο .env.example δημιουργήθηκε"

# =============================================================================
# Step 10: Start Supabase
# =============================================================================
print_status "Εκκίνηση Supabase (αυτό μπορεί να πάρει λίγο χρόνο)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_warning "Το Docker δεν τρέχει. Εκκίνηση Docker..."
    sudo systemctl start docker
    sleep 5
fi

# Start Supabase
cd "$PROJECT_DIR"
supabase start

# Get Supabase credentials
print_status "Λήψη Supabase credentials..."
SUPABASE_STATUS=$(supabase status)
echo "$SUPABASE_STATUS"

# Extract values
API_URL=$(echo "$SUPABASE_STATUS" | grep "API URL" | awk '{print $NF}')
ANON_KEY=$(echo "$SUPABASE_STATUS" | grep "anon key" | awk '{print $NF}')
SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | grep "service_role key" | awk '{print $NF}')

# Create .env file
cat > .env << EOFENV
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=local
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
EOFENV

print_success "Αρχείο .env δημιουργήθηκε με τα credentials"

# =============================================================================
# Step 11: Create admin user script
# =============================================================================
print_status "Δημιουργία script για δημιουργία admin χρήστη..."

cat > create-admin.sh << 'EOFADMIN'
#!/bin/bash

# Script για δημιουργία admin χρήστη

echo "=== Δημιουργία Admin Χρήστη ==="
echo ""

read -p "Email: " ADMIN_EMAIL
read -s -p "Password: " ADMIN_PASSWORD
echo ""
read -p "Full Name: " ADMIN_NAME

# Create user using Supabase CLI
supabase auth admin create-user "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --data "{\"full_name\": \"$ADMIN_NAME\"}"

# Get user ID and assign admin role
USER_ID=$(supabase db query "SELECT id FROM auth.users WHERE email = '$ADMIN_EMAIL'" --output json | jq -r '.[0].id')

if [ -n "$USER_ID" ]; then
    supabase db query "INSERT INTO public.user_roles (user_id, role) VALUES ('$USER_ID', 'admin') ON CONFLICT DO NOTHING"
    echo ""
    echo "✓ Admin χρήστης δημιουργήθηκε επιτυχώς!"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Role: admin"
else
    echo "✗ Σφάλμα κατά τη δημιουργία του χρήστη"
fi
EOFADMIN

chmod +x create-admin.sh
print_success "Script create-admin.sh δημιουργήθηκε"

# =============================================================================
# Step 12: Create management scripts
# =============================================================================
print_status "Δημιουργία management scripts..."

# Start script
cat > start.sh << 'EOFSTART'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Supabase..."
supabase start
echo ""
echo "Starting frontend..."
npm run dev
EOFSTART

# Stop script
cat > stop.sh << 'EOFSTOP'
#!/bin/bash
cd "$(dirname "$0")"
echo "Stopping Supabase..."
supabase stop
EOFSTOP

# Reset script
cat > reset.sh << 'EOFRESET'
#!/bin/bash
cd "$(dirname "$0")"
echo "Resetting database..."
supabase db reset
echo "Done!"
EOFRESET

chmod +x start.sh stop.sh reset.sh
print_success "Management scripts δημιουργήθηκαν"

# =============================================================================
# Final instructions
# =============================================================================
echo ""
echo "=============================================="
echo "   Η εγκατάσταση ολοκληρώθηκε επιτυχώς!      "
echo "=============================================="
echo ""
print_success "Supabase τρέχει στο: $API_URL"
print_success "Studio UI: http://localhost:54323"
echo ""
echo "Επόμενα βήματα:"
echo ""
echo "1. Κλώνε το repository ή αντίγραψε τα αρχεία frontend:"
echo "   git clone <your-repo-url> frontend"
echo "   cd frontend && npm install"
echo ""
echo "2. Δημιούργησε τον πρώτο admin χρήστη:"
echo "   cd $PROJECT_DIR"
echo "   ./create-admin.sh"
echo ""
echo "3. Ξεκίνα την εφαρμογή:"
echo "   ./start.sh"
echo ""
echo "Χρήσιμες εντολές:"
echo "  ./start.sh   - Εκκίνηση Supabase και frontend"
echo "  ./stop.sh    - Τερματισμός Supabase"
echo "  ./reset.sh   - Reset database"
echo ""
print_warning "ΣΗΜΑΝΤΙΚΟ: Αν χρησιμοποιήσατε sudo, κάντε logout/login για το docker group"
echo ""
