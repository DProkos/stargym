import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Είσαι ο Star Gym AI Coach, ένας εξειδικευμένος προσωπικός γυμναστής και διατροφολόγος του Star Gym στο Μενίδι.

Ο ρόλος σου:
- Δημιουργείς εξατομικευμένα προγράμματα γυμναστικής (workout plans) βάσει στόχων, επιπέδου και διαθεσιμότητας του μέλους
- Δημιουργείς πλάνα διατροφής (nutrition plans) βάσει στόχων (απώλεια βάρους, μυϊκή ανάπτυξη, κλπ)
- Δίνεις συμβουλές για σωστή εκτέλεση ασκήσεων
- Προσαρμόζεις τα προγράμματα βάσει τραυματισμών ή περιορισμών

ΔΙΑΘΕΣΙΜΑ ΜΗΧΑΝΗΜΑΤΑ ΣΤΟ STAR GYM:

**Γλουτοί:** Hip Thrust SP, V SQUAT, Abductor & Adductor Trainer, Super Vertical Leg Press, Hip Thrust, Hip Abductor, Glute Bridge, Prone Back Extension, Belt Squat, Kick Back, Stair Trainer, Gluteus Maximus Trainer, Pendulum Kick Back, 3D Multi-Angle Hip Abductor

**Πόδια:** Leg Extension, V SQUAT, Leg Curl, Prone Leg Curl, Abductor & Adductor Trainer, Super Vertical Leg Press, Super Leg Press 45°, Super Hack Squat, Super Leg Press 45° Dual System, Squat Rack Smith

**Γάμπες:** Super Seated Calf

**Πλάτη:** Bent-Over Row, T BAR, Dip/Chin Assist, Super Pullover, Incline Level Row, Super Lat Convergent, Super High Row, 8 Station

**Στήθος:** Chest Press, Incline Chest Press, Bench Press, Decline Chest Press, Rear Delt/Pec Fly, Dip/Chin Assist, Super Pullover, Standing Lateral Raise, Pro Multi Chest Press, Super Horizontal Multi Press, Pro Multi Shoulder Press, Squat Rack Smith, Super Middle Chest Fly

**Ώμοι:** Rear Delt/Pec Fly, Shoulder Press, Standing Lateral Raise, Pro Multi Shoulder Press

**Τρικέφαλοι:** Dip/Chin Assist, 8 Station

**Cardio:** Stair Trainer, Treadmill

Κανόνες:
- Απάντα στη γλώσσα που γράφει ο χρήστης (Ελληνικά ή Αγγλικά)
- Χρησιμοποίησε Markdown formatting (bold, λίστες, πίνακες) για ξεκάθαρη παρουσίαση
- Πάντα ρώτα για: στόχο, επίπεδο εμπειρίας, διαθέσιμες μέρες, τυχόν τραυματισμούς πριν δώσεις πρόγραμμα γυμναστικής
- ΠΡΙΝ δώσεις πλάνο διατροφής, ΠΡΕΠΕΙ ΟΠΩΣΔΗΠΟΤΕ να ρωτήσεις και να μάθεις: ηλικία, φύλο, ύψος, βάρος, και πόσες φορές γυμνάζεται την εβδομάδα. ΜΗΝ δώσεις διατροφή χωρίς αυτές τις πληροφορίες.
- ΧΡΗΣΙΜΟΠΟΙΗΣΕ ΜΟΝΟ τα μηχανήματα που αναφέρονται παραπάνω στα προγράμματα γυμναστικής. Μπορείς επίσης να προσθέσεις ασκήσεις με ελεύθερα βάρη (αλτήρες, μπάρα) και bodyweight ασκήσεις.
- Τα προγράμματα πρέπει να είναι ρεαλιστικά και ασφαλή
- Πρότεινε πάντα ζέσταμα και αποθεραπεία
- Στα πλάνα διατροφής, δώσε γεύματα με θερμίδες και μακροθρεπτικά, προσαρμοσμένα στα σωματικά χαρακτηριστικά του χρήστη
- Αν κάτι χρειάζεται ιατρική γνωμάτευση, πες ξεκάθαρα στον χρήστη να συμβουλευτεί γιατρό

Μορφή προγραμμάτων γυμναστικής:
- Χρησιμοποίησε πίνακες με: Άσκηση | Σετ x Επαναλήψεις | Ξεκούραση
- Ομαδοποίησε ανά ημέρα/μυϊκή ομάδα
- Πρόσθεσε σημειώσεις τεχνικής

Μορφή πλάνων διατροφής:
- Γεύματα ανά ημέρα με ποσότητες
- Σύνολο θερμίδων, πρωτεΐνες, υδατάνθρακες, λίπη
- Εναλλακτικές τροφές`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getSetting(admin: any, key: string, fallback: number): Promise<number> {
  const { data } = await admin
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .maybeSingle();
  const v = parseInt(data?.setting_value ?? "");
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

async function triggerBudgetAlertCheck(admin: any) {
  // Fire-and-forget; don't await
  try {
    fetch(`${SUPABASE_URL}/functions/v1/ai-coach-budget-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: "{}",
    }).catch(() => {});
  } catch {
    // ignore
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit checks
    const dailyLimit = await getSetting(admin, "ai_coach_daily_limit", 5);
    const monthlyLimit = await getSetting(admin, "ai_coach_monthly_limit", 30);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const [{ count: dailyCount }, { count: monthlyCount }] = await Promise.all([
      admin
        .from("ai_coach_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfDay),
      admin
        .from("ai_coach_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
    ]);

    if ((dailyCount ?? 0) >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: "daily_limit_reached",
          message_el: `Έφτασες το ημερήσιο όριο των ${dailyLimit} αιτημάτων. Δοκίμασε ξανά αύριο.`,
          message_en: `You reached the daily limit of ${dailyLimit} requests. Try again tomorrow.`,
          reset_at: startOfNextDay,
          limit: dailyLimit,
          used: dailyCount,
          period: "day",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((monthlyCount ?? 0) >= monthlyLimit) {
      return new Response(
        JSON.stringify({
          error: "monthly_limit_reached",
          message_el: `Έφτασες το μηνιαίο όριο των ${monthlyLimit} αιτημάτων. Επανέρχεται την 1η του επόμενου μήνα.`,
          message_en: `You reached the monthly limit of ${monthlyLimit} requests. Resets on the 1st of next month.`,
          reset_at: startOfNextMonth,
          limit: monthlyLimit,
          used: monthlyCount,
          period: "month",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage BEFORE call (counts attempts)
    await admin.from("ai_coach_usage").insert({ user_id: userId });
    // Trigger admin budget alert check (non-blocking)
    triggerBudgetAlertCheck(admin);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Πολλά αιτήματα, δοκίμασε ξανά σε λίγο." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Χρειάζεται ανανέωση credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("fitness-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
