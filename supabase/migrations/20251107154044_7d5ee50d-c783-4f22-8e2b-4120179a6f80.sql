-- Create admin activity log table
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'role_added', 'role_removed', 'user_created', 'settings_changed', etc.
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all logs
CREATE POLICY "Admins can view all activity logs"
ON public.admin_activity_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create policy for admins to insert logs
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_admin_id ON public.admin_activity_log(admin_id);

-- Enable realtime for this table
ALTER TABLE public.admin_activity_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_activity_log;