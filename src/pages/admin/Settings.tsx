import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Eye, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmailBlockEditor } from '@/components/email-editor/EmailBlockEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MembershipTier {
  id: string;
  name: string;
  description: string;
  price: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  features: string[];
  duration_months: number;
  is_active: boolean;
  display_order: number;
}

interface Subscription {
  id: string;
  user_id: string;
  tier_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  profiles: { email: string; full_name: string };
  membership_tiers: { name: string };
}

export default function Settings() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [recaptchaSettings, setRecaptchaSettings] = useState({
    siteKey: '',
    secretKey: '',
  });
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    password: '',
    fromEmail: '',
    fromName: 'My Gym',
  });
  const [authSettings, setAuthSettings] = useState({
    signupEnabled: true,
  });
  const [contactSettings, setContactSettings] = useState({
    recipientEmail: '',
    autoReplySubjectEl: 'Λάβαμε το μήνυμά σας!',
    autoReplySubjectEn: 'We received your message!',
    autoReplyHeadingEl: '✉️ Ευχαριστούμε για το μήνυμά σας!',
    autoReplyHeadingEn: '✉️ Thank you for your message!',
    autoReplyBodyEl: 'Λάβαμε το μήνυμά σας και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.\n\nΣας ευχαριστούμε για το ενδιαφέρον σας!',
    autoReplyBodyEn: 'We received your message and will get back to you as soon as possible.\n\nThank you for your interest!',
    autoReplySignatureEl: 'Η Ομάδα μας',
    autoReplySignatureEn: 'Our Team',
    autoReplyHeadingColor: '#FFD700',
  });
  const [contactLangTab, setContactLangTab] = useState<'el' | 'en'>('el');
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingSmtpTestEmail, setSendingSmtpTestEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stripe_price_id: '',
    stripe_product_id: '',
    features: '',
    duration_months: '1',
    is_active: true,
    display_order: '0',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadTiers();
      loadSubscriptions();
      loadRecaptchaSettings();
      loadSmtpSettings();
      loadAuthSettings();
      loadContactSettings();
      loadNewsletterSubscribers();
      loadCampaigns();
      loadEmailTemplates();
    }
  }, [isAdmin]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasAdminRole = roleData?.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      navigate('/');
      return;
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setUserEmail(profile.email);
    }

    setIsAdmin(true);
  };

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to load membership tiers');
      return;
    }

    setTiers((data || []).map(tier => ({
      ...tier,
      features: Array.isArray(tier.features) ? tier.features.map(f => String(f)) : []
    })));
  };

  const loadSubscriptions = async () => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        membership_tiers(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load subscriptions');
      return;
    }

    // Fetch profiles separately
    const subsWithProfiles = await Promise.all((data || []).map(async (sub) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', sub.user_id)
        .single();
      
      return {
        ...sub,
        profiles: profile || { email: '', full_name: '' }
      };
    }));

    setSubscriptions(subsWithProfiles as any);
  };

  const loadRecaptchaSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['recaptcha_site_key', 'recaptcha_secret_key']);

    if (error) {
      console.error('Failed to load reCAPTCHA settings:', error);
      return;
    }

    const settings = {
      siteKey: data?.find(s => s.setting_key === 'recaptcha_site_key')?.setting_value || '',
      secretKey: data?.find(s => s.setting_key === 'recaptcha_secret_key')?.setting_value || '',
    };

    setRecaptchaSettings(settings);
  };

  const loadSmtpSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'smtp_host',
        'smtp_port',
        'smtp_secure',
        'smtp_user',
        'smtp_password',
        'smtp_from_email',
        'smtp_from_name',
      ]);

    if (error) {
      console.error('Failed to load SMTP settings:', error);
      return;
    }

    const settings = {
      host: data?.find((s) => s.setting_key === 'smtp_host')?.setting_value || '',
      port: data?.find((s) => s.setting_key === 'smtp_port')?.setting_value || '587',
      secure: data?.find((s) => s.setting_key === 'smtp_secure')?.setting_value === 'true',
      user: data?.find((s) => s.setting_key === 'smtp_user')?.setting_value || '',
      password: data?.find((s) => s.setting_key === 'smtp_password')?.setting_value || '',
      fromEmail: data?.find((s) => s.setting_key === 'smtp_from_email')?.setting_value || '',
      fromName: data?.find((s) => s.setting_key === 'smtp_from_name')?.setting_value || 'My Gym',
    };

    setSmtpSettings(settings);
  };

  const loadAuthSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'signup_enabled')
      .maybeSingle();

    if (error) {
      console.error('Failed to load auth settings:', error);
      return;
    }

    setAuthSettings({
      signupEnabled: data?.setting_value !== 'false',
    });
  };

  const loadContactSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'contact_form_recipient_email',
        'contact_auto_reply_subject_el',
        'contact_auto_reply_subject_en',
        'contact_auto_reply_heading_el',
        'contact_auto_reply_heading_en',
        'contact_auto_reply_body_el',
        'contact_auto_reply_body_en',
        'contact_auto_reply_signature_el',
        'contact_auto_reply_signature_en',
        'contact_auto_reply_heading_color',
      ]);

    if (error) {
      console.error('Failed to load contact settings:', error);
      return;
    }

    const getValue = (key: string, fallback: string) => 
      data?.find(s => s.setting_key === key)?.setting_value || fallback;

    setContactSettings({
      recipientEmail: getValue('contact_form_recipient_email', ''),
      autoReplySubjectEl: getValue('contact_auto_reply_subject_el', 'Λάβαμε το μήνυμά σας!'),
      autoReplySubjectEn: getValue('contact_auto_reply_subject_en', 'We received your message!'),
      autoReplyHeadingEl: getValue('contact_auto_reply_heading_el', '✉️ Ευχαριστούμε για το μήνυμά σας!'),
      autoReplyHeadingEn: getValue('contact_auto_reply_heading_en', '✉️ Thank you for your message!'),
      autoReplyBodyEl: getValue('contact_auto_reply_body_el', 'Λάβαμε το μήνυμά σας και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.\n\nΣας ευχαριστούμε για το ενδιαφέρον σας!'),
      autoReplyBodyEn: getValue('contact_auto_reply_body_en', 'We received your message and will get back to you as soon as possible.\n\nThank you for your interest!'),
      autoReplySignatureEl: getValue('contact_auto_reply_signature_el', 'Η Ομάδα μας'),
      autoReplySignatureEn: getValue('contact_auto_reply_signature_en', 'Our Team'),
      autoReplyHeadingColor: getValue('contact_auto_reply_heading_color', '#FFD700'),
    });
  };

  const handleSaveContactSettings = async () => {
    try {
      const settingsToSave = [
        { setting_key: 'contact_form_recipient_email', setting_value: contactSettings.recipientEmail },
        { setting_key: 'contact_auto_reply_subject_el', setting_value: contactSettings.autoReplySubjectEl },
        { setting_key: 'contact_auto_reply_subject_en', setting_value: contactSettings.autoReplySubjectEn },
        { setting_key: 'contact_auto_reply_heading_el', setting_value: contactSettings.autoReplyHeadingEl },
        { setting_key: 'contact_auto_reply_heading_en', setting_value: contactSettings.autoReplyHeadingEn },
        { setting_key: 'contact_auto_reply_body_el', setting_value: contactSettings.autoReplyBodyEl },
        { setting_key: 'contact_auto_reply_body_en', setting_value: contactSettings.autoReplyBodyEn },
        { setting_key: 'contact_auto_reply_signature_el', setting_value: contactSettings.autoReplySignatureEl },
        { setting_key: 'contact_auto_reply_signature_en', setting_value: contactSettings.autoReplySignatureEn },
        { setting_key: 'contact_auto_reply_heading_color', setting_value: contactSettings.autoReplyHeadingColor },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { 
              ...setting,
              is_sensitive: false,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'setting_key' }
          );
        if (error) throw error;
      }

      toast.success('Οι ρυθμίσεις φόρμας επικοινωνίας αποθηκεύτηκαν');
    } catch (error) {
      console.error('Failed to save contact settings:', error);
      toast.error('Αποτυχία αποθήκευσης ρυθμίσεων');
    }
  };

  const loadNewsletterSubscribers = async () => {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load newsletter subscribers:', error);
      return;
    }

    setNewsletterSubscribers(data || []);
  };

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load campaigns:', error);
      return;
    }

    setCampaigns(data || []);
  };

  const loadEmailTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('category', 'notification')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading email templates:', error);
      toast.error('Failed to load email templates');
    } else {
      setEmailTemplates(data || []);
    }
  };

  const handleSaveRecaptchaSettings = async () => {
    try {
      const updates = [
        {
          setting_key: 'recaptcha_site_key',
          setting_value: recaptchaSettings.siteKey,
        },
        {
          setting_key: 'recaptcha_secret_key',
          setting_value: recaptchaSettings.secretKey,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ setting_value: update.setting_value })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      toast.success('reCAPTCHA settings saved successfully');
    } catch (error) {
      console.error('Failed to save reCAPTCHA settings:', error);
      toast.error('Failed to save reCAPTCHA settings');
    }
  };

  const handleSaveSmtpSettings = async () => {
    try {
      const updates = [
        { setting_key: 'smtp_host', setting_value: smtpSettings.host, is_sensitive: false },
        { setting_key: 'smtp_port', setting_value: smtpSettings.port, is_sensitive: false },
        { setting_key: 'smtp_secure', setting_value: smtpSettings.secure.toString(), is_sensitive: false },
        { setting_key: 'smtp_user', setting_value: smtpSettings.user, is_sensitive: false },
        { setting_key: 'smtp_password', setting_value: smtpSettings.password, is_sensitive: true },
        { setting_key: 'smtp_from_email', setting_value: smtpSettings.fromEmail, is_sensitive: false },
        { setting_key: 'smtp_from_name', setting_value: smtpSettings.fromName, is_sensitive: false },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { 
              setting_key: update.setting_key, 
              setting_value: update.setting_value,
              is_sensitive: update.is_sensitive,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'setting_key' }
          );

        if (error) throw error;
      }

      toast.success('SMTP settings saved successfully');
    } catch (error) {
      console.error('Failed to save SMTP settings:', error);
      toast.error('Failed to save SMTP settings');
    }
  };

  const handleSaveAuthSettings = async () => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: authSettings.signupEnabled.toString() })
        .eq('setting_key', 'signup_enabled');

      if (error) throw error;

      toast.success('Authentication settings saved successfully');
    } catch (error) {
      console.error('Failed to save auth settings:', error);
      toast.error('Failed to save authentication settings');
    }
  };

  const handleSaveEmailTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          html_template: editingTemplate.html_template,
          description: editingTemplate.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast.success('Email template updated successfully');
      loadEmailTemplates();
      setEditingTemplate(null);
      setShowTemplatePreview(false);
      setShowVisualEditor(false);
    } catch (error: any) {
      console.error('Error saving email template:', error);
      toast.error('Failed to save email template: ' + error.message);
    }
  };

  const handleVisualEditorSave = (html: string) => {
    if (!editingTemplate) return;
    
    setEditingTemplate({
      ...editingTemplate,
      html_template: html,
    });
    
    // Auto-save after visual editor
    handleSaveEmailTemplate();
  };

  const getPreviewHtml = () => {
    if (!editingTemplate) return '';
    
    // Sample data for preview
    const sampleData = {
      title: 'Ακύρωση 2 Τάξεων',
      intro_text: 'Σας ενημερώνουμε ότι οι παρακάτω τάξεις έχουν ακυρωθεί:',
      class_list: `
        <li style="color: #333; font-size: 15px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <strong>Yoga για Αρχάριους</strong> - Δευτέρα στις 10:00 (15/01/2025)
        </li>
        <li style="color: #333; font-size: 15px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <strong>HIIT Training</strong> - Τετάρτη στις 18:30 (17/01/2025)
        </li>
      `
    };

    let html = editingTemplate.html_template;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });

    return html;
  };

  const handleSendTestEmail = async () => {
    if (!editingTemplate || !userEmail) {
      toast.error('Unable to send test email');
      return;
    }

    setSendingTestEmail(true);

    try {
      const html = getPreviewHtml();
      const subject = '[TEST] ' + (editingTemplate.name === 'class_deletion_notification' 
        ? 'Ακύρωση 2 Τάξεων - Ειδοποίηση' 
        : 'Test Email');

      const text = `
Test Email - ${editingTemplate.name}

Αυτό είναι ένα test email για το template: ${editingTemplate.description}

Περιεχόμενο:
- Yoga για Αρχάριους - Δευτέρα στις 10:00 (15/01/2025)
- HIIT Training - Τετάρτη στις 18:30 (17/01/2025)

Με εκτίμηση,
Η ομάδα του γυμναστηρίου
      `;

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          subject: subject,
          html: html,
          text: text
        }
      });

      if (error) throw error;

      toast.success(`Test email στάλθηκε επιτυχώς στο ${userEmail}`);
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error('Αποτυχία αποστολής test email: ' + (error.message || 'Unknown error'));
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSendSmtpTestEmail = async () => {
    if (!userEmail) {
      toast.error('Δεν βρέθηκε email χρήστη');
      return;
    }

    setSendingSmtpTestEmail(true);

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          subject: '[TEST] SMTP Configuration Test',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333;">SMTP Test Successful!</h1>
              <p>Αυτό είναι ένα δοκιμαστικό email για επιβεβαίωση ότι οι ρυθμίσεις SMTP λειτουργούν σωστά.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 14px;">
                <strong>SMTP Host:</strong> ${smtpSettings.host}<br/>
                <strong>SMTP Port:</strong> ${smtpSettings.port}<br/>
                <strong>From:</strong> ${smtpSettings.fromName} &lt;${smtpSettings.fromEmail}&gt;
              </p>
            </div>
          `,
          text: `SMTP Test Successful!\n\nΑυτό είναι ένα δοκιμαστικό email για επιβεβαίωση ότι οι ρυθμίσεις SMTP λειτουργούν σωστά.\n\nSMTP Host: ${smtpSettings.host}\nSMTP Port: ${smtpSettings.port}\nFrom: ${smtpSettings.fromName} <${smtpSettings.fromEmail}>`
        }
      });

      if (error) throw error;

      toast.success(`Test email στάλθηκε επιτυχώς στο ${userEmail}`);
    } catch (error: any) {
      console.error('Error sending SMTP test email:', error);
      toast.error('Αποτυχία αποστολής test email: ' + (error.message || 'Unknown error'));
    } finally {
      setSendingSmtpTestEmail(false);
    }
  };

  const handleOpenDialog = (tier?: MembershipTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        description: tier.description || '',
        price: tier.price.toString(),
        stripe_price_id: tier.stripe_price_id || '',
        stripe_product_id: tier.stripe_product_id || '',
        features: tier.features.join('\n'),
        duration_months: tier.duration_months.toString(),
        is_active: tier.is_active,
        display_order: tier.display_order.toString(),
      });
    } else {
      setEditingTier(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stripe_price_id: '',
        stripe_product_id: '',
        features: '',
        duration_months: '1',
        is_active: true,
        display_order: '0',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveTier = async () => {
    const tierData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stripe_price_id: formData.stripe_price_id || null,
      stripe_product_id: formData.stripe_product_id || null,
      features: formData.features.split('\n').filter(f => f.trim()),
      duration_months: parseInt(formData.duration_months),
      is_active: formData.is_active,
      display_order: parseInt(formData.display_order),
    };

    if (editingTier) {
      const { error } = await supabase
        .from('membership_tiers')
        .update(tierData)
        .eq('id', editingTier.id);

      if (error) {
        toast.error('Failed to update membership tier');
        return;
      }
      toast.success('Membership tier updated');
    } else {
      const { error } = await supabase
        .from('membership_tiers')
        .insert([tierData]);

      if (error) {
        toast.error('Failed to create membership tier');
        return;
      }
      toast.success('Membership tier created');
    }

    setIsDialogOpen(false);
    loadTiers();
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership tier?')) return;

    const { error } = await supabase
      .from('membership_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete membership tier');
      return;
    }

    toast.success('Membership tier deleted');
    loadTiers();
  };

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-16 items-center px-6">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold ml-4">Settings</h1>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="memberships" className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="memberships">Membership Tiers</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="stripe">Stripe Settings</TabsTrigger>
                <TabsTrigger value="recaptcha">reCAPTCHA Settings</TabsTrigger>
                <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                <TabsTrigger value="contact">Φόρμα Επικοινωνίας</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
                <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
              </TabsList>

              <TabsContent value="memberships" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Membership Tiers</CardTitle>
                        <CardDescription>Manage membership plans and pricing</CardDescription>
                      </div>
                      <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tier
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tiers.map((tier) => (
                          <TableRow key={tier.id}>
                            <TableCell className="font-medium">{tier.name}</TableCell>
                            <TableCell>${tier.price}/mo</TableCell>
                            <TableCell>{tier.duration_months} month(s)</TableCell>
                            <TableCell>
                              <span className={tier.is_active ? 'text-green-600' : 'text-red-600'}>
                                {tier.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(tier)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTier(tier.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Subscriptions</CardTitle>
                    <CardDescription>View and manage user subscriptions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Period End</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              {sub.profiles?.full_name || sub.profiles?.email}
                            </TableCell>
                            <TableCell>{sub.membership_tiers?.name}</TableCell>
                            <TableCell>
                              <span className={sub.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                                {sub.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {sub.current_period_end 
                                ? new Date(sub.current_period_end).toLocaleDateString()
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stripe" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Stripe Configuration</CardTitle>
                    <CardDescription>Configure Stripe API keys and webhooks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Stripe Publishable Key</Label>
                      <Input placeholder="pk_test_..." />
                      <p className="text-sm text-muted-foreground">
                        Add your Stripe publishable key to enable checkout
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Stripe Secret Key</Label>
                      <Input type="password" placeholder="sk_test_..." />
                      <p className="text-sm text-muted-foreground">
                        Your secret key is stored securely and never exposed to clients
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Endpoint</Label>
                      <Input 
                        readOnly 
                        value={`${window.location.origin}/api/stripe-webhook`}
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Configure this webhook URL in your Stripe dashboard
                      </p>
                    </div>
                    <Button>Save Stripe Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recaptcha" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Google reCAPTCHA v3 Configuration</CardTitle>
                    <CardDescription>
                      Configure reCAPTCHA to protect registration and contact forms from bots
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>reCAPTCHA Site Key</Label>
                      <Input 
                        placeholder="6Lc..." 
                        value={recaptchaSettings.siteKey}
                        onChange={(e) => setRecaptchaSettings({ ...recaptchaSettings, siteKey: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Your site key from Google reCAPTCHA console (visible to users)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>reCAPTCHA Secret Key</Label>
                      <Input 
                        type="password" 
                        placeholder="6Lc..." 
                        value={recaptchaSettings.secretKey}
                        onChange={(e) => setRecaptchaSettings({ ...recaptchaSettings, secretKey: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Your secret key is stored securely in the database and used for server-side verification
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Get reCAPTCHA Keys</Label>
                      <p className="text-sm text-muted-foreground">
                        1. Go to{' '}
                        <a 
                          href="https://www.google.com/recaptcha/admin" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Google reCAPTCHA Admin Console
                        </a>
                        <br />
                        2. Register a new site with reCAPTCHA v3
                        <br />
                        3. Add your domain to the authorized domains
                        <br />
                        4. Copy the Site Key and Secret Key here
                      </p>
                    </div>
                    <Button onClick={handleSaveRecaptchaSettings}>Save reCAPTCHA Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="smtp" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SMTP Configuration</CardTitle>
                    <CardDescription>
                      Configure SMTP server for sending emails (verification codes, newsletters, etc.)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SMTP Host</Label>
                        <Input
                          placeholder="smtp.gmail.com"
                          value={smtpSettings.host}
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input
                          placeholder="587"
                          value={smtpSettings.port}
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Username</Label>
                      <Input
                        placeholder="your-email@gmail.com"
                        value={smtpSettings.user}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Password</Label>
                      <Input
                        type="password"
                        placeholder="App password or SMTP password"
                        value={smtpSettings.password}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Email</Label>
                        <Input
                          placeholder="noreply@yourgym.com"
                          value={smtpSettings.fromEmail}
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>From Name</Label>
                        <Input
                          placeholder="My Gym"
                          value={smtpSettings.fromName}
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={smtpSettings.secure}
                        onCheckedChange={(checked) => setSmtpSettings({ ...smtpSettings, secure: checked })}
                      />
                      <Label>Use TLS/SSL</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveSmtpSettings}>Save SMTP Settings</Button>
                      <Button 
                        variant="outline" 
                        onClick={handleSendSmtpTestEmail}
                        disabled={sendingSmtpTestEmail || !smtpSettings.host || !userEmail}
                      >
                        {sendingSmtpTestEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Αποστολή...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Test Email
                          </>
                        )}
                      </Button>
                    </div>
                    {userEmail && (
                      <p className="text-sm text-muted-foreground">
                        Το test email θα σταλεί στο: <strong>{userEmail}</strong>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

               <TabsContent value="contact" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ρυθμίσεις Φόρμας Επικοινωνίας</CardTitle>
                    <CardDescription>
                      Ορίστε το email παραλήπτη και προσαρμόστε το αυτόματο email απάντησης
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Email Παραλήπτη</Label>
                      <Input
                        type="email"
                        placeholder="info@yourgym.com"
                        value={contactSettings.recipientEmail}
                        onChange={(e) => setContactSettings({ ...contactSettings, recipientEmail: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Τα μηνύματα που υποβάλλονται μέσω της φόρμας επικοινωνίας θα αποστέλλονται σε αυτό το email
                      </p>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Αυτόματο Email Απάντησης</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Αυτό το email στέλνεται αυτόματα στον αποστολέα όταν συμπληρώσει τη φόρμα επικοινωνίας.
                        Η γλώσσα του email εξαρτάται από τη γλώσσα που έχει επιλέξει ο χρήστης στο site.
                      </p>

                      <div className="space-y-2 mb-4">
                        <Label>Χρώμα Επικεφαλίδας</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={contactSettings.autoReplyHeadingColor}
                            onChange={(e) => setContactSettings({ ...contactSettings, autoReplyHeadingColor: e.target.value })}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={contactSettings.autoReplyHeadingColor}
                            onChange={(e) => setContactSettings({ ...contactSettings, autoReplyHeadingColor: e.target.value })}
                            className="w-32"
                            placeholder="#FFD700"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <Button
                          variant={contactLangTab === 'el' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContactLangTab('el')}
                        >
                          🇬🇷 Ελληνικά
                        </Button>
                        <Button
                          variant={contactLangTab === 'en' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContactLangTab('en')}
                        >
                          🇬🇧 English
                        </Button>
                      </div>
                      
                      {contactLangTab === 'el' ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Θέμα Email (EL)</Label>
                            <Input
                              placeholder="π.χ. Λάβαμε το μήνυμά σας!"
                              value={contactSettings.autoReplySubjectEl}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplySubjectEl: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Επικεφαλίδα (EL)</Label>
                            <Input
                              placeholder="π.χ. ✉️ Ευχαριστούμε για το μήνυμά σας!"
                              value={contactSettings.autoReplyHeadingEl}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplyHeadingEl: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Κείμενο Μηνύματος (EL)</Label>
                            <Textarea
                              placeholder="Γράψτε το κείμενο του αυτόματου email..."
                              value={contactSettings.autoReplyBodyEl}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplyBodyEl: e.target.value })}
                              rows={5}
                            />
                            <p className="text-sm text-muted-foreground">
                              Χρησιμοποιήστε {"{{name}}"} για να εμφανίζεται το όνομα του αποστολέα
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Υπογραφή (EL)</Label>
                            <Input
                              placeholder="π.χ. Η Ομάδα μας"
                              value={contactSettings.autoReplySignatureEl}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplySignatureEl: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Email Subject (EN)</Label>
                            <Input
                              placeholder="e.g. We received your message!"
                              value={contactSettings.autoReplySubjectEn}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplySubjectEn: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Heading (EN)</Label>
                            <Input
                              placeholder="e.g. ✉️ Thank you for your message!"
                              value={contactSettings.autoReplyHeadingEn}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplyHeadingEn: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Message Body (EN)</Label>
                            <Textarea
                              placeholder="Write the auto-reply email text..."
                              value={contactSettings.autoReplyBodyEn}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplyBodyEn: e.target.value })}
                              rows={5}
                            />
                            <p className="text-sm text-muted-foreground">
                              Use {"{{name}}"} to display the sender's name
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Signature (EN)</Label>
                            <Input
                              placeholder="e.g. Our Team"
                              value={contactSettings.autoReplySignatureEn}
                              onChange={(e) => setContactSettings({ ...contactSettings, autoReplySignatureEn: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button onClick={handleSaveContactSettings}>Αποθήκευση</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="auth" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Authentication Settings</CardTitle>
                    <CardDescription>
                      Configure authentication and user registration options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Enable User Registration</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow new users to create accounts. Disable to restrict registration.
                        </p>
                      </div>
                      <Switch
                        checked={authSettings.signupEnabled}
                        onCheckedChange={(checked) => 
                          setAuthSettings({ ...authSettings, signupEnabled: checked })
                        }
                      />
                    </div>
                    <Button onClick={handleSaveAuthSettings}>Save Authentication Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email-templates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Templates for Notifications</CardTitle>
                    <CardDescription>
                      Customize email templates used for system notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>{template.description}</TableCell>
                            <TableCell>{template.category}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingTemplate(template)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {editingTemplate && !showVisualEditor && (
                      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Edit Template: {editingTemplate.name}</CardTitle>
                            <CardDescription>
                              Use the following variables: {'{{title}}'}, {'{{intro_text}}'}, {'{{class_list}}'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={editingTemplate.description || ''}
                                onChange={(e) => setEditingTemplate({
                                  ...editingTemplate,
                                  description: e.target.value
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>HTML Template</Label>
                              <Textarea
                                value={editingTemplate.html_template || ''}
                                onChange={(e) => setEditingTemplate({
                                  ...editingTemplate,
                                  html_template: e.target.value
                                })}
                                rows={20}
                                className="font-mono text-sm"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={handleSaveEmailTemplate}>
                                Save Template
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {showTemplatePreview ? 'Hide Preview' : 'Show Preview'}
                              </Button>
                              <Button 
                                variant="secondary"
                                onClick={handleSendTestEmail}
                                disabled={sendingTestEmail}
                              >
                                {sendingTestEmail ? 'Αποστολή...' : 'Send Test Email'}
                              </Button>
                              <Button 
                                variant="secondary"
                                onClick={() => setShowVisualEditor(true)}
                              >
                                Visual Editor
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  setEditingTemplate(null);
                                  setShowTemplatePreview(false);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                            {userEmail && (
                              <p className="text-sm text-muted-foreground">
                                Test email θα σταλεί στο: {userEmail}
                              </p>
                            )}
                          </CardContent>
                        </Card>

                        {showTemplatePreview && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Email Preview</CardTitle>
                              <CardDescription>
                                Προεπισκόπηση του email με δείγματα δεδομένων
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[600px]">
                                <div 
                                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {editingTemplate && showVisualEditor && (
                      <div className="mt-6">
                        <EmailBlockEditor
                          initialHtml={editingTemplate.html_template}
                          onSave={handleVisualEditorSave}
                          onCancel={() => setShowVisualEditor(false)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="newsletter" className="space-y-4">
                <div className="mb-4 flex gap-2">
                  <Button onClick={() => navigate('/admin/newsletter')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Campaign
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/email-templates')}>
                    <Eye className="h-4 w-4 mr-2" />
                    Browse Templates
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Newsletter Campaigns</CardTitle>
                    <CardDescription>
                      View and manage newsletter campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent Count</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">{campaign.title}</TableCell>
                            <TableCell>{campaign.subject}</TableCell>
                            <TableCell>
                              <span className={
                                campaign.status === 'sent' ? 'text-green-600' :
                                campaign.status === 'sending' ? 'text-yellow-600' :
                                'text-muted-foreground'
                              }>
                                {campaign.status}
                              </span>
                            </TableCell>
                            <TableCell>{campaign.sent_count || 0}</TableCell>
                            <TableCell>
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {campaign.status === 'sent' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/admin/campaign-analytics/${campaign.id}`)}
                                >
                                  View Analytics
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Newsletter Subscribers</CardTitle>
                    <CardDescription>
                      Manage newsletter subscribers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        Total subscribers: <span className="font-bold">{newsletterSubscribers.length}</span>
                      </p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Subscribed</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newsletterSubscribers.map((subscriber) => (
                          <TableRow key={subscriber.id}>
                            <TableCell>{subscriber.email}</TableCell>
                            <TableCell>{subscriber.name || 'N/A'}</TableCell>
                            <TableCell>
                              <span className={subscriber.subscribed ? 'text-green-600' : 'text-red-600'}>
                                {subscriber.subscribed ? 'Yes' : 'No'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(subscriber.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit' : 'Add'} Membership Tier</DialogTitle>
            <DialogDescription>
              Configure membership plan details and pricing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Basic, Premium, VIP"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this tier"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (per month)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.99"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stripe Product ID</Label>
                <Input
                  value={formData.stripe_product_id}
                  onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })}
                  placeholder="prod_..."
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Price ID</Label>
                <Input
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                  placeholder="price_..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Unlimited classes&#10;Personal trainer&#10;Nutrition plan"
                rows={5}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>
              {editingTier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
