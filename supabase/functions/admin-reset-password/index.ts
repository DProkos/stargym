import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { userId, action, newPassword } = await req.json();

    if (!userId || !action) {
      throw new Error('Missing required fields');
    }

    if (action === 'manual') {
      // Manual password change by admin
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }

      // Log the action
      await supabaseAdmin.from('admin_activity_log').insert({
        admin_id: user.id,
        action_type: 'password_changed_manual',
        target_user_id: userId,
        details: { changed_at: new Date().toISOString() }
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'send_reset_link') {
      // Get user email
      const { data: userData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userFetchError || !userData.user) {
        throw new Error('User not found');
      }

      const userEmail = userData.user.email;
      if (!userEmail) {
        throw new Error('User has no email');
      }

      // Generate reset token (valid for 10 minutes)
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save token to database
      const { error: tokenError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          token: token,
          expires_at: expiresAt.toISOString()
        });

      if (tokenError) {
        console.error('Error creating reset token:', tokenError);
        throw new Error('Failed to create reset token');
      }

      // Get site URL from settings or use default
      const { data: siteSettings } = await supabaseAdmin
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'site_url')
        .maybeSingle();

      const baseUrl = siteSettings?.setting_value || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://stargym.lovable.app';
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      // Send email using send-email function
      const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
        body: {
          to: userEmail,
          subject: 'Επαναφορά Κωδικού Πρόσβασης',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Επαναφορά Κωδικού Πρόσβασης</h2>
              <p>Λάβατε αυτό το email επειδή ζητήθηκε επαναφορά κωδικού για τον λογαριασμό σας.</p>
              <p>Κάντε κλικ στον παρακάτω σύνδεσμο για να ορίσετε νέο κωδικό:</p>
              <p style="margin: 20px 0;">
                <a href="${resetLink}" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Επαναφορά Κωδικού
                </a>
              </p>
              <p><strong>Σημαντικό:</strong> Ο σύνδεσμος ισχύει για 10 λεπτά.</p>
              <p style="color: #666; font-size: 12px;">Αν δεν ζητήσατε εσείς αυτή την επαναφορά, αγνοήστε αυτό το email.</p>
            </div>
          `
        }
      });

      if (emailError) {
        console.error('Error sending reset email:', emailError);
        throw new Error('Failed to send reset email');
      }

      // Log the action
      await supabaseAdmin.from('admin_activity_log').insert({
        admin_id: user.id,
        action_type: 'password_reset_link_sent',
        target_user_id: userId,
        details: { sent_to: userEmail, expires_at: expiresAt.toISOString() }
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Reset link sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in admin-reset-password:', error);
    const isAuthError = error.message?.includes('Unauthorized');
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to reset password' }),
      { status: isAuthError ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
