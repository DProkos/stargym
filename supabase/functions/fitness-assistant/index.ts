import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

Κανόνες:
- Απάντα στη γλώσσα που γράφει ο χρήστης (Ελληνικά ή Αγγλικά)
- Χρησιμοποίησε Markdown formatting (bold, λίστες, πίνακες) για ξεκάθαρη παρουσίαση
- Πάντα ρώτα για: στόχο, επίπεδο εμπειρίας, διαθέσιμες μέρες, τυχόν τραυματισμούς πριν δώσεις πρόγραμμα γυμναστικής
- ΠΡΙΝ δώσεις πλάνο διατροφής, ΠΡΕΠΕΙ ΟΠΩΣΔΗΠΟΤΕ να ρωτήσεις και να μάθεις: ηλικία, φύλο, ύψος, βάρος, και πόσες φορές γυμνάζεται την εβδομάδα. ΜΗΝ δώσεις διατροφή χωρίς αυτές τις πληροφορίες.
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
