import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're admin
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin only.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name, position, department, phone, role } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role - default to employee if not specified or invalid
    const userRole = role === 'admin' ? 'admin' : 'employee';

    // Create the user account using service role
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can login immediately
    });

    if (createError) {
      console.error('Create user error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add user role (admin or employee based on input)
    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: userRole });

    if (roleInsertError) {
      console.error('Role insert error:', roleInsertError);
    }

    console.log(`User ${email} created with role: ${userRole}`);

    // Create employee profile
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .insert({
        user_id: newUser.user.id,
        full_name,
        email,
        position: position || null,
        department: department || null,
        phone: phone || null,
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Employee insert error:', employeeError);
      return new Response(
        JSON.stringify({ error: employeeError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee created successfully:', employee.id);

    return new Response(
      JSON.stringify({ success: true, employee }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
