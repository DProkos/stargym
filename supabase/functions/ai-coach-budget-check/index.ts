import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const THRESHOLDS = [80, 95];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Read budget settings
    const { data: budgetSetting } = await admin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "ai_coach_monthly_budget_requests")
      .maybeSingle();
    const monthlyBudget = parseInt(budgetSetting?.setting_value ?? "1650") || 1650;

    // Count this month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { count: monthlyUsage } = await admin
      .from("ai_coach_usage")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth);

    const used = monthlyUsage ?? 0;
    const pct = (used / monthlyBudget) * 100;

    // Find which thresholds we just crossed
    const crossedThresholds = THRESHOLDS.filter((t) => pct >= t);
    if (crossedThresholds.length === 0) {
      return new Response(JSON.stringify({ ok: true, used, pct }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find which ones haven't been notified this month
    const { data: alreadySent } = await admin
      .from("ai_coach_alerts_sent")
      .select("threshold")
      .eq("year_month", yearMonth);
    const sentSet = new Set((alreadySent ?? []).map((r: any) => r.threshold));
    const toNotify = crossedThresholds.filter((t) => !sentSet.has(t));

    if (toNotify.length === 0) {
      return new Response(JSON.stringify({ ok: true, used, pct, alreadyNotified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the highest new threshold (only send one email)
    const threshold = Math.max(...toNotify);

    // Get admin email recipient (use contact_form_recipient_email or first admin)
    let recipientEmail: string | null = null;
    const { data: recipientSetting } = await admin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "contact_form_recipient_email")
      .maybeSingle();
    if (recipientSetting?.setting_value) {
      recipientEmail = recipientSetting.setting_value;
    } else {
      // Fall back to first admin's email
      const { data: adminRoles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);
      if (adminRoles && adminRoles.length > 0) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", adminRoles[0].user_id)
          .maybeSingle();
        recipientEmail = profile?.email ?? null;
      }
    }

    if (!recipientEmail) {
      console.error("No admin recipient email found");
      return new Response(JSON.stringify({ error: "No recipient" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compose HTML email
    const remaining = Math.max(0, monthlyBudget - used);
    const subject = `⚠️ AI Coach: ${threshold}% του μηνιαίου budget χρησιμοποιήθηκε`;
    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f6f6f6;padding:20px;color:#222;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#000;color:#FFD700;padding:20px;text-align:center;">
      <h1 style="margin:0;font-size:22px;">⚠️ AI Coach Budget Alert</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:16px;margin:0 0 12px;">
        Το AI Coach έχει φτάσει το <strong>${pct.toFixed(1)}%</strong> του μηνιαίου budget χρήσης.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Χρήση μήνα:</strong></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${used} αιτήματα</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Συνολικό budget:</strong></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${monthlyBudget} αιτήματα</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Υπόλοιπο:</strong></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${remaining} αιτήματα</td></tr>
        <tr><td style="padding:8px;"><strong>Ποσοστό:</strong></td><td style="padding:8px;text-align:right;color:${threshold >= 95 ? "#c00" : "#e67e00"};font-weight:bold;">${pct.toFixed(1)}%</td></tr>
      </table>
      <p style="font-size:14px;color:#555;margin:16px 0 0;">
        ${threshold >= 95
          ? "🚨 <strong>Επείγον:</strong> Το budget σχεδόν εξαντλήθηκε. Σκέψου να αυξήσεις τα όρια ανά χρήστη ή να προσθέσεις credits στο Lovable workspace."
          : "💡 Σκέψου να ενημερώσεις τους χρήστες ή να προσθέσεις credits στο Lovable workspace πριν εξαντληθεί."}
      </p>
      <p style="font-size:12px;color:#999;margin:24px 0 0;text-align:center;">
        Star Gym Admin Notifications · ${new Date().toLocaleDateString("el-GR")}
      </p>
    </div>
  </div>
</body></html>`;

    // Call send-email function
    const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        html,
      }),
    });

    if (!sendResp.ok) {
      const txt = await sendResp.text();
      console.error("send-email failed:", sendResp.status, txt);
      return new Response(JSON.stringify({ error: "Email failed", details: txt }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record sent alert
    await admin.from("ai_coach_alerts_sent").insert({
      year_month: yearMonth,
      threshold,
    });

    return new Response(
      JSON.stringify({ ok: true, used, pct, notified: threshold, recipient: recipientEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-coach-budget-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
