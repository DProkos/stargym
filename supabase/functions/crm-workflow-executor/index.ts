import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowAction {
  type: "send_email" | "add_tag" | "update_status" | "add_note";
  config: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { workflowId, customerId, triggerData } = await req.json();

    console.log(`Executing workflow ${workflowId} for customer ${customerId}`);

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("crm_workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error("Workflow not found");
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
      throw new Error("Customer not found");
    }

    const executedActions: any[] = [];
    const actions = workflow.actions as WorkflowAction[];

    // Execute each action in the workflow
    for (const action of actions) {
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
      created_by: workflow.created_by,
    });

    return new Response(
      JSON.stringify({ success: true, executedActions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error executing workflow:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeEmailAction(supabase: any, customer: any, config: any) {
  const { subject, template } = config;
  
  // Replace placeholders in template
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

  // Check if tag assignment already exists
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

  await supabase
    .from("profiles")
    .update({ customer_status: status })
    .eq("id", customerId);
}

async function executeAddNoteAction(supabase: any, customerId: string, config: any) {
  const { noteContent, adminUserId } = config;

  await supabase.from("crm_notes").insert({
    customer_id: customerId,
    content: noteContent,
    created_by: adminUserId,
  });
}