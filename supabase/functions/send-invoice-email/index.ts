import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const invoiceEmailSchema = z.object({
  invoice_id: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      console.error('Unauthorized invoice email send attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = invoiceEmailSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { invoice_id } = validationResult.data;

    // Fetch invoice details with customer info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:profiles!customer_id(email, full_name)
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoice_id);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice_id)
      .order('sort_order');

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching invoice items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice settings for company details
    const { data: settings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching invoice settings:', settingsError);
    }

    // Get customer email
    const customerEmail = invoice.customer?.email;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Customer email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build email HTML
    const itemsHtml = items?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${parseFloat(item.total_price).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Τιμολόγιο ${invoice.invoice_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Τιμολόγιο</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${invoice.invoice_number}</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <div style="margin-bottom: 30px;">
            <p><strong>Αγαπητέ/ή ${invoice.customer?.full_name || 'πελάτη'},</strong></p>
            <p>Σας αποστέλλουμε το τιμολόγιό σας. Παρακαλούμε βρείτε τις λεπτομέρειες παρακάτω:</p>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <h3 style="margin: 0 0 10px 0; color: #667eea;">Στοιχεία Εταιρείας</h3>
              <p style="margin: 5px 0;"><strong>${settings?.company_name || 'Vigor Track'}</strong></p>
              ${settings?.company_address ? `<p style="margin: 5px 0;">${settings.company_address}</p>` : ''}
              ${settings?.company_phone ? `<p style="margin: 5px 0;">Τηλ: ${settings.company_phone}</p>` : ''}
              ${settings?.company_email ? `<p style="margin: 5px 0;">Email: ${settings.company_email}</p>` : ''}
              ${settings?.company_tax_id ? `<p style="margin: 5px 0;">ΑΦΜ: ${settings.company_tax_id}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0;"><strong>Ημερομηνία Έκδοσης:</strong> ${new Date(invoice.issue_date).toLocaleDateString('el-GR')}</p>
              <p style="margin: 5px 0;"><strong>Ημερομηνία Λήξης:</strong> ${new Date(invoice.due_date).toLocaleDateString('el-GR')}</p>
              <p style="margin: 5px 0;"><strong>Κατάσταση:</strong> <span style="color: ${invoice.status === 'paid' ? '#10b981' : '#f59e0b'};">${invoice.status === 'paid' ? 'Πληρωμένο' : invoice.status === 'sent' ? 'Απεσταλμένο' : invoice.status === 'draft' ? 'Πρόχειρο' : 'Ληξιπρόθεσμο'}</span></p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #667eea;">Περιγραφή</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">Ποσότητα</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #667eea;">Τιμή Μονάδας</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #667eea;">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; margin-bottom: 30px;">
            <p style="margin: 5px 0;"><strong>Υποσύνολο:</strong> €${parseFloat(invoice.subtotal).toFixed(2)}</p>
            ${invoice.discount_amount > 0 ? `<p style="margin: 5px 0;"><strong>Έκπτωση:</strong> -€${parseFloat(invoice.discount_amount).toFixed(2)}</p>` : ''}
            <p style="margin: 5px 0;"><strong>ΦΠΑ (${invoice.tax_rate}%):</strong> €${parseFloat(invoice.tax_amount).toFixed(2)}</p>
            <p style="margin: 15px 0 0 0; font-size: 20px; color: #667eea;"><strong>Συνολικό Ποσό:</strong> €${parseFloat(invoice.total_amount).toFixed(2)}</p>
          </div>

          ${invoice.notes ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #667eea;">Σημειώσεις:</h4>
            <p style="margin: 0;">${invoice.notes}</p>
          </div>
          ` : ''}

          ${invoice.payment_terms ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <h4 style="margin: 0 0 10px 0; color: #856404;">Όροι Πληρωμής:</h4>
            <p style="margin: 0;">${invoice.payment_terms}</p>
          </div>
          ` : ''}

          ${settings?.bank_details ? `
          <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 5px; border-left: 4px solid #667eea;">
            <h4 style="margin: 0 0 10px 0; color: #667eea;">Τραπεζικά Στοιχεία:</h4>
            <p style="margin: 0; white-space: pre-line;">${settings.bank_details}</p>
          </div>
          ` : ''}
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; color: #666;">
          <p style="margin: 0; font-size: 14px;">Ευχαριστούμε για την εμπιστοσύνη σας!</p>
          ${settings?.footer_text ? `<p style="margin: 10px 0 0 0; font-size: 12px;">${settings.footer_text}</p>` : ''}
        </div>
      </body>
      </html>
    `;

    const textContent = `
Τιμολόγιο: ${invoice.invoice_number}

Αγαπητέ/ή ${invoice.customer?.full_name || 'πελάτη'},

Σας αποστέλλουμε το τιμολόγιό σας.

Ημερομηνία Έκδοσης: ${new Date(invoice.issue_date).toLocaleDateString('el-GR')}
Ημερομηνία Λήξης: ${new Date(invoice.due_date).toLocaleDateString('el-GR')}
Κατάσταση: ${invoice.status === 'paid' ? 'Πληρωμένο' : invoice.status === 'sent' ? 'Απεσταλμένο' : invoice.status === 'draft' ? 'Πρόχειρο' : 'Ληξιπρόθεσμο'}

Συνολικό Ποσό: €${parseFloat(invoice.total_amount).toFixed(2)}

Ευχαριστούμε για την εμπιστοσύνη σας!
    `;

    // Call the send-email function
    const emailResponse = await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Τιμολόγιο ${invoice.invoice_number} - ${settings?.company_name || 'Vigor Track'}`,
        html,
        text: textContent,
      },
      headers: {
        Authorization: authHeader,
      },
    });

    if (emailResponse.error) {
      console.error('Error sending invoice email:', emailResponse.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResponse.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update invoice status to 'sent' if it was 'draft'
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', invoice_id);
    }

    console.log(`Invoice email sent successfully to ${customerEmail} for invoice ${invoice.invoice_number}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice email sent successfully',
        recipient: customerEmail 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send invoice email', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
