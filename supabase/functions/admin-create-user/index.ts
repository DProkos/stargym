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
    const { email, password, fullName, phone, roles } = await req.json();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    console.log(`Admin ${user.id} creating user with email: ${email}`);

    // Create user using admin client - bypasses signup_enabled check
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name: fullName || ''
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    // Update profile with additional info if provided
    if (newUser.user && (fullName || phone)) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: fullName || null,
          phone: phone || null
        })
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    // Assign roles if specified
    const rolesToAssign = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    
    if (newUser.user && rolesToAssign.length > 0) {
      for (const roleToAdd of rolesToAssign) {
        // Skip 'member' as it's already added by trigger
        if (roleToAdd === 'member') continue;
        
        // Check if role already exists
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', newUser.user.id)
          .eq('role', roleToAdd)
          .maybeSingle();

        if (!existingRole) {
          const { error: roleInsertError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: newUser.user.id,
              role: roleToAdd
            });

          if (roleInsertError) {
            console.error(`Error assigning role ${roleToAdd}:`, roleInsertError);
          } else {
            console.log(`Role ${roleToAdd} assigned to user ${newUser.user.id}`);
          }
        }
      }
    }

    console.log(`User created successfully with id: ${newUser.user?.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        userId: newUser.user?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in admin-create-user function:', error);
    const isAuthError = error.message?.includes('Unauthorized') || error.message?.includes('authorization');
    const status = isAuthError ? 403 : 400;
    const message = isAuthError ? "Unauthorized: Admin access required" : "Failed to create user. Please check input and try again.";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
