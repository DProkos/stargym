-- Create customer tags table
CREATE TABLE public.customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create customer_tags_assignments junction table
CREATE TABLE public.customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(customer_id, tag_id)
);

-- Create customer segments table
CREATE TABLE public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create CRM notes table
CREATE TABLE public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false
);

-- Create CRM interactions table (for tracking customer interactions)
CREATE TABLE public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- email, call, meeting, note, booking, etc.
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create CRM workflows table
CREATE TABLE public.crm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- new_customer, booking_made, tag_added, segment_joined, etc.
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of actions to execute
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  last_run_at TIMESTAMPTZ,
  total_runs INTEGER NOT NULL DEFAULT 0
);

-- Create workflow execution log
CREATE TABLE public.crm_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- success, failed, pending
  error_message TEXT,
  executed_actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add customer lifetime value and other CRM fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_booking_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acquisition_source TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes_summary TEXT;

-- Enable RLS
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_tags
CREATE POLICY "Admins can manage customer tags"
  ON public.customer_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for customer_tag_assignments
CREATE POLICY "Admins can manage tag assignments"
  ON public.customer_tag_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own tags"
  ON public.customer_tag_assignments FOR SELECT
  USING (auth.uid() = customer_id);

-- RLS Policies for customer_segments
CREATE POLICY "Admins can manage segments"
  ON public.customer_segments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for crm_notes
CREATE POLICY "Admins can manage notes"
  ON public.crm_notes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own notes"
  ON public.crm_notes FOR SELECT
  USING (auth.uid() = customer_id);

-- RLS Policies for crm_interactions
CREATE POLICY "Admins can manage interactions"
  ON public.crm_interactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own interactions"
  ON public.crm_interactions FOR SELECT
  USING (auth.uid() = customer_id);

-- RLS Policies for crm_workflows
CREATE POLICY "Admins can manage workflows"
  ON public.crm_workflows FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for crm_workflow_executions
CREATE POLICY "Admins can view workflow executions"
  ON public.crm_workflow_executions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_customer_tag_assignments_customer ON public.customer_tag_assignments(customer_id);
CREATE INDEX idx_customer_tag_assignments_tag ON public.customer_tag_assignments(tag_id);
CREATE INDEX idx_crm_notes_customer ON public.crm_notes(customer_id);
CREATE INDEX idx_crm_interactions_customer ON public.crm_interactions(customer_id);
CREATE INDEX idx_crm_interactions_type ON public.crm_interactions(interaction_type);
CREATE INDEX idx_crm_workflow_executions_workflow ON public.crm_workflow_executions(workflow_id);
CREATE INDEX idx_crm_workflow_executions_customer ON public.crm_workflow_executions(customer_id);
CREATE INDEX idx_profiles_customer_status ON public.profiles(customer_status);

-- Create trigger for updating updated_at
CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_notes_updated_at
  BEFORE UPDATE ON public.crm_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_workflows_updated_at
  BEFORE UPDATE ON public.crm_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();