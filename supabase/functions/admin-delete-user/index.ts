import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a client with the user's token to verify they're authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Parse request body
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('Missing required field: userId');
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      throw new Error('Cannot delete your own account');
    }

    // Delete related data first to avoid foreign key constraints
    console.log(`Deleting related data for user ${userId}`);

    // Delete bookings
    await supabaseAdmin.from('bookings').delete().eq('user_id', userId);
    
    // Delete waitlist entries
    await supabaseAdmin.from('waitlist').delete().eq('user_id', userId);
    
    // Delete invoices and invoice items (customer_id)
    const { data: invoices } = await supabaseAdmin.from('invoices').select('id').eq('customer_id', userId);
    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map(i => i.id);
      await supabaseAdmin.from('invoice_items').delete().in('invoice_id', invoiceIds);
      await supabaseAdmin.from('invoices').delete().eq('customer_id', userId);
    }
    
    // Delete CRM data
    await supabaseAdmin.from('crm_notes').delete().eq('customer_id', userId);
    await supabaseAdmin.from('crm_interactions').delete().eq('customer_id', userId);
    await supabaseAdmin.from('customer_tag_assignments').delete().eq('customer_id', userId);
    await supabaseAdmin.from('crm_workflow_executions').delete().eq('customer_id', userId);
    
    // Delete user subscriptions
    await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', userId);
    
    // Delete password change codes
    await supabaseAdmin.from('password_change_codes').delete().eq('user_id', userId);
    
    // Delete email verification codes
    await supabaseAdmin.from('email_verification_codes').delete().eq('user_id', userId);
    
    // Delete user roles (should cascade, but doing explicitly)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    console.log(`Related data deleted, now deleting auth user ${userId}`);

    // Delete user using admin API
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }

    // Log the action
    await supabaseAdmin
      .from('admin_activity_log')
      .insert({
        admin_id: user.id,
        action_type: 'user_deleted',
        target_user_id: userId,
        details: { deleted_at: new Date().toISOString() }
      });

    console.log(`User ${userId} deleted successfully by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in admin-delete-user function:', error);
    const isAuthError = error.message?.includes('Unauthorized') || error.message?.includes('authorization');
    const isSelfDelete = error.message?.includes('Cannot delete your own');
    const status = isAuthError ? 403 : (isSelfDelete ? 400 : 500);
    const message = isAuthError 
      ? "Unauthorized: Admin access required" 
      : (isSelfDelete ? error.message : "Failed to delete user. Please try again.");
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
