import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://esm.sh/zod@3.25.76';

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

async function fetchGymData() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [trainersRes, packagesRes, classesRes, settingsRes] = await Promise.all([
    supabase.from('trainers').select('name, specialization, bio'),
    supabase.from('service_packages').select('name, description, price, duration_months, sessions_included, features').eq('is_active', true),
    supabase.from('classes').select('name, description, day_of_week, time, duration_minutes, max_capacity, status').eq('status', 'active'),
    supabase.from('site_settings').select('setting_key, setting_value').in('setting_key', [
      'contact_phone', 'contact_email', 'contact_address',
      'working_hours', 'working_hours_weekday', 'working_hours_weekend', 'site_name'
    ]),
  ]);

  const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const trainers = trainersRes.data || [];
  const packages = packagesRes.data || [];
  const classes = classesRes.data || [];
  const settings: Record<string, string> = {};
  settingsRes.data?.forEach((s: any) => { if (s.setting_value) settings[s.setting_key] = s.setting_value; });

  return { trainers, packages, classes, settings, dayNames, dayNamesEn };
}

function buildDynamicContext(data: Awaited<ReturnType<typeof fetchGymData>>, lang: string) {
  const { trainers, packages, classes, settings, dayNames, dayNamesEn } = data;
  const days = lang === 'el' ? dayNames : dayNamesEn;
  let ctx = '';

  // Site info
  if (settings.site_name) ctx += `${lang === 'el' ? 'Όνομα γυμναστηρίου' : 'Gym name'}: ${settings.site_name}\n`;
  if (settings.contact_phone) ctx += `${lang === 'el' ? 'Τηλέφωνο' : 'Phone'}: ${settings.contact_phone}\n`;
  if (settings.contact_email) ctx += `Email: ${settings.contact_email}\n`;
  if (settings.contact_address) ctx += `${lang === 'el' ? 'Διεύθυνση' : 'Address'}: ${settings.contact_address}\n`;
  if (settings.working_hours) ctx += `${lang === 'el' ? 'Ωράριο' : 'Hours'}: ${settings.working_hours}\n`;
  if (settings.working_hours_weekday) ctx += `${lang === 'el' ? 'Καθημερινές' : 'Weekdays'}: ${settings.working_hours_weekday}\n`;
  if (settings.working_hours_weekend) ctx += `${lang === 'el' ? 'Σαββατοκύριακο' : 'Weekend'}: ${settings.working_hours_weekend}\n`;

  // Trainers
  if (trainers.length > 0) {
    ctx += `\n${lang === 'el' ? '--- ΓΥΜΝΑΣΤΕΣ ---' : '--- TRAINERS ---'}\n`;
    trainers.forEach((t: any) => {
      ctx += `- ${t.name}`;
      if (t.specialization) ctx += ` (${t.specialization})`;
      if (t.bio) ctx += `: ${t.bio}`;
      ctx += '\n';
    });
  }

  // Packages
  if (packages.length > 0) {
    ctx += `\n${lang === 'el' ? '--- ΠΑΚΕΤΑ / ΠΡΟΣΦΟΡΕΣ ---' : '--- PACKAGES / OFFERS ---'}\n`;
    packages.forEach((p: any) => {
      ctx += `- ${p.name}: €${p.price}`;
      if (p.duration_months) ctx += ` / ${p.duration_months} ${lang === 'el' ? 'μήνες' : 'months'}`;
      if (p.sessions_included) ctx += ` (${p.sessions_included} ${lang === 'el' ? 'συνεδρίες' : 'sessions'})`;
      ctx += '\n';
      if (p.description) ctx += `  ${p.description}\n`;
      if (p.features && Array.isArray(p.features) && p.features.length > 0) {
        ctx += `  ${lang === 'el' ? 'Χαρακτηριστικά' : 'Features'}: ${p.features.join(', ')}\n`;
      }
    });
  }

  // Classes
  if (classes.length > 0) {
    ctx += `\n${lang === 'el' ? '--- ΜΑΘΗΜΑΤΑ ---' : '--- CLASSES ---'}\n`;
    classes.forEach((c: any) => {
      const day = days[c.day_of_week] || '';
      const time = c.time?.substring(0, 5) || '';
      ctx += `- ${c.name}: ${day} ${time} (${c.duration_minutes}${lang === 'el' ? 'λ' : 'min'})`;
      if (c.description) ctx += ` - ${c.description}`;
      ctx += '\n';
    });
  }

  return ctx;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Fetch real gym data from database
    const gymData = await fetchGymData();
    const dynamicContext = buildDynamicContext(gymData, language);

    const systemPrompts: Record<string, string> = {
      en: `You are a helpful AI assistant for ${gymData.settings.site_name || 'Star Gym'}, a premium fitness center in Athens, Greece.
Your role is to answer questions about the gym using the REAL data provided below. Always use this data for accurate answers.

${dynamicContext}

Be friendly, concise, and helpful. If you don't know something specific, suggest they contact the gym directly or visit the website for more details.
Always answer in English.`,
      el: `Είσαι ένας χρήσιμος AI βοηθός για το ${gymData.settings.site_name || 'Star Gym'}, ένα premium γυμναστήριο στην Αθήνα.
Ο ρόλος σου είναι να απαντάς σε ερωτήσεις σχετικά με το γυμναστήριο χρησιμοποιώντας τα ΠΡΑΓΜΑΤΙΚΑ δεδομένα που ακολουθούν. Πάντα χρησιμοποίησε αυτά τα δεδομένα για ακριβείς απαντήσεις.

${dynamicContext}

Να είσαι φιλικός, συνοπτικός και εξυπηρετικός. Αν δεν γνωρίζεις κάτι συγκεκριμένο, πρότεινε να επικοινωνήσουν απευθείας με το γυμναστήριο ή να επισκεφθούν την ιστοσελίδα.
Πάντα απάντα στα Ελληνικά.`
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chatbot error:", e);
    return new Response(JSON.stringify({ error: "Service error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
