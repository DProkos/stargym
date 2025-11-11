import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const workflowSchema = z.object({
  workflowId: z.string().uuid({ message: "Invalid workflow ID format" }),
  customerId: z.string().uuid({ message: "Invalid customer ID format" }),
  triggerData: z.record(z.any()).optional(),
});

const actionSchema = z.object({
  type: z.enum(["send_email", "add_tag", "update_status", "add_note"]),
  config: z.record(z.any()),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, token);
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Unauthorized workflow execution attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = workflowSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { workflowId, customerId, triggerData } = validationResult.data;

    console.log(`Executing workflow ${workflowId} for customer ${customerId} by admin ${user.id}`);

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("crm_workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(
        JSON.stringify({ error: "Workflow not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workflow.is_active) {
      return new Response(
        JSON.stringify({ error: "Workflow is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const executedActions: any[] = [];
    const actions = workflow.actions as any[];

    // Validate and limit actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid actions in workflow" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (actions.length > 20) {
      return new Response(
        JSON.stringify({ error: "Too many actions in workflow (max 20)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute each action in the workflow
    for (const action of actions) {
      // Validate action structure
      const actionValidation = actionSchema.safeParse(action);
      if (!actionValidation.success) {
        executedActions.push({ 
          type: action.type || 'unknown', 
          status: "failed", 
          error: "Invalid action format" 
        });
        continue;
      }

      try {
        switch (action.type) {
          case "send_email":
            await executeEmailAction(supabase, customer, action.config);
            executedActions.push({ type: "send_email", status: "success" });
            break;

          case "add_tag":
            await executeAddTagAction(supabase, customerId, action.config);
            executedActions.push({ type: "add_tag", status: "success" });
            break;

          case "update_status":
            await executeUpdateStatusAction(supabase, customerId, action.config);
            executedActions.push({ type: "update_status", status: "success" });
            break;

          case "add_note":
            await executeAddNoteAction(supabase, customerId, action.config);
            executedActions.push({ type: "add_note", status: "success" });
            break;

          default:
            console.warn(`Unknown action type: ${action.type}`);
            executedActions.push({ type: action.type, status: "skipped", error: "Unknown action type" });
        }
      } catch (actionError) {
        console.error(`Error executing action ${action.type}:`, actionError);
        const errorMessage = actionError instanceof Error ? actionError.message : String(actionError);
        executedActions.push({ type: action.type, status: "failed", error: errorMessage });
      }
    }

    // Log workflow execution
    await supabase.from("crm_workflow_executions").insert({
      workflow_id: workflowId,
      customer_id: customerId,
      status: executedActions.every(a => a.status === "success") ? "success" : "partial",
      executed_actions: executedActions,
    });

    // Update workflow stats
    await supabase
      .from("crm_workflows")
      .update({
        total_runs: workflow.total_runs + 1,
        last_run_at: new Date().toISOString(),
      })
      .eq("id", workflowId);

    // Log interaction
    await supabase.from("crm_interactions").insert({
      customer_id: customerId,
      interaction_type: "workflow",
      title: `Workflow Executed: ${workflow.name}`,
      description: `Workflow triggered by ${workflow.trigger_type}`,
      metadata: { workflowId, triggerData, executedActions },
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({ success: true, executedActions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error executing workflow:", error);
    return new Response(
      JSON.stringify({ error: "Failed to execute workflow" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeEmailAction(supabase: any, customer: any, config: any) {
  const { subject, template } = config;
  
  // Validate and sanitize config
  if (!subject || typeof subject !== 'string' || subject.length > 200) {
    throw new Error('Invalid email subject');
  }
  if (!template || typeof template !== 'string' || template.length > 100000) {
    throw new Error('Invalid email template');
  }

  let emailBody = template
    .replace(/{{name}}/g, customer.full_name || "Customer")
    .replace(/{{email}}/g, customer.email);

  await supabase.functions.invoke("send-email", {
    body: {
      to: customer.email,
      subject,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, ""),
    },
  });
}

async function executeAddTagAction(supabase: any, customerId: string, config: any) {
  const { tagId, adminUserId } = config;

  if (!tagId || typeof tagId !== 'string') {
    throw new Error('Invalid tag ID');
  }

  const { data: existing } = await supabase
    .from("customer_tag_assignments")
    .select("id")
    .eq("customer_id", customerId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("customer_tag_assignments").insert({
      customer_id: customerId,
      tag_id: tagId,
      assigned_by: adminUserId,
    });
  }
}

async function executeUpdateStatusAction(supabase: any, customerId: string, config: any) {
  const { status } = config;

  if (!status || typeof status !== 'string' || status.length > 50) {
    throw new Error('Invalid status');
  }

  await supabase
    .from("profiles")
    .update({ customer_status: status })
    .eq("id", customerId);
}

async function executeAddNoteAction(supabase: any, customerId: string, config: any) {
  const { noteContent, adminUserId } = config;

  if (!noteContent || typeof noteContent !== 'string' || noteContent.length > 5000) {
    throw new Error('Invalid note content');
  }

  await supabase.from("crm_notes").insert({
    customer_id: customerId,
    content: noteContent,
    created_by: adminUserId,
  });
}
