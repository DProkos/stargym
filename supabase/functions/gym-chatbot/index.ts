import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const chatbotSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000, { message: "Message content too long" }),
  })).max(50, { message: "Too many messages in conversation" }),
  language: z.enum(['en', 'el']).optional().default('en'),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate input
    const requestBody = await req.json();
    const validationResult = chatbotSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, language } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompts: Record<string, string> = {
      en: `You are a helpful AI assistant for Star Gym, a premium fitness center. 
Your role is to answer questions about:
- Gym facilities and equipment
- Class schedules and types (yoga, strength training, cardio, HIIT)
- Membership plans (Basic, Premium, VIP)
- Pricing and payment options
- Opening hours and location
- Trainer information and booking procedures

Key Information:
- Opening Hours: Monday-Friday 6AM-11PM, Saturday-Sunday 7AM-10PM
- Location: Star Gym, Athens, Greece
- Membership Plans: Basic (€79/month), Premium (€129/month), VIP (€199/month)
- All plans include unlimited gym access and group classes
- Premium and VIP include personal training sessions
- Free trial available for new members
- Class booking available through customer portal

Be friendly, concise, and helpful. If you don't know something specific, suggest they contact the gym directly or visit the website for more details.`,
      el: `Είσαι ένας χρήσιμος AI βοηθός για το Star Gym, ένα premium γυμναστήριο.
Ο ρόλος σου είναι να απαντάς σε ερωτήσεις σχετικά με:
- Εγκαταστάσεις και εξοπλισμό του γυμναστηρίου
- Πρόγραμμα και τύπους μαθημάτων (γιόγκα, προπόνηση δύναμης, καρδιο, HIIT)
- Πακέτα συνδρομής (Basic, Premium, VIP)
- Τιμές και τρόποι πληρωμής
- Ωράριο λειτουργίας και τοποθεσία
- Πληροφορίες προπονητών και διαδικασία κράτησης

Βασικές Πληροφορίες:
- Ωράριο: Δευτέρα-Παρασκευή 6ΠΜ-11ΜΜ, Σαββατοκύριακο 7ΠΜ-10ΜΜ
- Τοποθεσία: Star Gym, Αθήνα, Ελλάδα
- Πακέτα Συνδρομής: Basic (€79/μήνα), Premium (€129/μήνα), VIP (€199/μήνα)
- Όλα τα πακέτα περιλαμβάνουν απεριόριστη πρόσβαση και ομαδικά μαθήματα
- Premium και VIP περιλαμβάνουν συνεδρίες personal training
- Δωρεάν δοκιμή για νέα μέλη
- Κράτηση μαθημάτων διαθέσιμη μέσω της πύλης πελατών

Να είσαι φιλικός, συνοπτικός και εξυπηρετικός. Αν δεν γνωρίζεις κάτι συγκεκριμένο, πρότεινε να επικοινωνήσουν απευθείας με το γυμναστήριο ή να επισκεφθούν την ιστοσελίδα.`
    };

    const selectedPrompt = systemPrompts[language];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: selectedPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chatbot error:", e);
    return new Response(JSON.stringify({ error: "Service error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
