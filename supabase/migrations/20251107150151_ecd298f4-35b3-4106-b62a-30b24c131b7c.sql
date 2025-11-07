-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  thumbnail_url TEXT,
  html_template TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Anyone can view templates"
  ON public.email_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.email_templates (name, description, category, html_template, is_system) VALUES
(
  'Promotion Template',
  'Perfect for announcing sales, discounts, and special offers',
  'promotion',
  '<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Special Offer!</h1>
    </div>
    <div style="background: #ffffff; padding: 40px 20px;">
      <h2 style="color: #333; font-size: 24px;">Hi {name}!</h2>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We have an exclusive offer just for you! Get ready to transform your fitness journey.
      </p>
      <div style="background: #f7fafc; padding: 30px; margin: 30px 0; border-radius: 8px; text-align: center;">
        <p style="color: #667eea; font-size: 48px; font-weight: bold; margin: 0;">50% OFF</p>
        <p style="color: #666; font-size: 18px; margin: 10px 0 0 0;">All Membership Plans</p>
      </div>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        This offer is valid for a limited time only. Don''t miss out on this amazing opportunity!
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 18px; display: inline-block;">
          Claim Your Offer
        </a>
      </div>
    </div>
    <div style="background: #f7fafc; padding: 20px; text-align: center; color: #999; font-size: 14px;">
      <p>© 2024 Your Gym. All rights reserved.</p>
    </div>
  </div>',
  true
),
(
  'Event Invitation',
  'Invite members to special events, workshops, and classes',
  'event',
  '<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px;">🎊 You''re Invited!</h1>
    </div>
    <div style="background: #ffffff; padding: 40px 20px;">
      <h2 style="color: #333; font-size: 24px;">Hi {name}!</h2>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Join us for an exciting event that you won''t want to miss!
      </p>
      <div style="background: #fff5f7; border-left: 4px solid #f5576c; padding: 20px; margin: 30px 0;">
        <h3 style="color: #f5576c; margin: 0 0 15px 0; font-size: 20px;">Event Details</h3>
        <p style="color: #666; margin: 5px 0;"><strong>📅 Date:</strong> Saturday, March 15, 2024</p>
        <p style="color: #666; margin: 5px 0;"><strong>⏰ Time:</strong> 10:00 AM - 2:00 PM</p>
        <p style="color: #666; margin: 5px 0;"><strong>📍 Location:</strong> Main Gym Studio</p>
      </div>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        This is a great opportunity to learn, connect, and have fun with fellow members!
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 18px; display: inline-block;">
          Register Now
        </a>
      </div>
    </div>
    <div style="background: #f7fafc; padding: 20px; text-align: center; color: #999; font-size: 14px;">
      <p>© 2024 Your Gym. All rights reserved.</p>
    </div>
  </div>',
  true
),
(
  'Announcement',
  'Share important news and updates with your members',
  'announcement',
  '<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px;">📢 Important Update</h1>
    </div>
    <div style="background: #ffffff; padding: 40px 20px;">
      <h2 style="color: #333; font-size: 24px;">Hi {name}!</h2>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We have some exciting news to share with you!
      </p>
      <div style="background: #e6f7ff; padding: 25px; margin: 30px 0; border-radius: 8px;">
        <h3 style="color: #0066cc; margin: 0 0 15px 0; font-size: 22px;">What''s New?</h3>
        <ul style="color: #666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
          <li>New equipment added to the gym floor</li>
          <li>Extended operating hours on weekends</li>
          <li>Free nutrition consultation for all members</li>
        </ul>
      </div>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We''re constantly working to improve your experience. Stay tuned for more updates!
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 18px; display: inline-block;">
          Learn More
        </a>
      </div>
    </div>
    <div style="background: #f7fafc; padding: 20px; text-align: center; color: #999; font-size: 14px;">
      <p>© 2024 Your Gym. All rights reserved.</p>
    </div>
  </div>',
  true
),
(
  'Welcome Email',
  'Welcome new members with a warm introduction',
  'welcome',
  '<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px;">👋 Welcome!</h1>
    </div>
    <div style="background: #ffffff; padding: 40px 20px;">
      <h2 style="color: #333; font-size: 24px;">Hi {name}!</h2>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Welcome to our fitness family! We''re thrilled to have you on board.
      </p>
      <div style="background: #fffbf0; padding: 25px; margin: 30px 0; border-radius: 8px; text-align: center;">
        <p style="color: #ff6b6b; font-size: 20px; font-weight: bold; margin: 0 0 10px 0;">🎁 Special Welcome Gift</p>
        <p style="color: #666; font-size: 16px; margin: 0;">Free personal training session + nutrition guide</p>
      </div>
      <h3 style="color: #333; font-size: 20px;">Getting Started:</h3>
      <ul style="color: #666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
        <li>Complete your profile</li>
        <li>Book your first class</li>
        <li>Meet our trainers</li>
        <li>Explore our facilities</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 18px; display: inline-block;">
          Get Started
        </a>
      </div>
    </div>
    <div style="background: #f7fafc; padding: 20px; text-align: center; color: #999; font-size: 14px;">
      <p>© 2024 Your Gym. All rights reserved.</p>
    </div>
  </div>',
  true
);