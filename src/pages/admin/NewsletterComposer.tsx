import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Send, Save, Eye } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function NewsletterComposer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    checkAuth();
    loadSubscriberCount();
    
    // Load template if passed via navigation state
    const state = location.state as { template?: string };
    if (state?.template) {
      setHtmlContent(state.template);
    }
  }, [location]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
  };

  const loadSubscriberCount = async () => {
    const { count } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);

    setSubscriberCount(count || 0);
  };

  const handleSaveDraft = async () => {
    if (!title || !subject || !htmlContent) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Convert HTML to plain text
      const textContent = htmlContent.replace(/<[^>]*>/g, '');

      const { error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          title,
          subject,
          html_content: htmlContent,
          text_content: textContent,
          status: 'draft',
          created_by: session.user.id,
        });

      if (error) throw error;

      toast.success('Draft saved successfully');
      navigate('/admin/settings?tab=newsletter');
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async () => {
    if (!title || !subject || !htmlContent) {
      toast.error('Please fill in all fields');
      return;
    }

    if (subscriberCount === 0) {
      toast.error('No subscribers to send to');
      return;
    }

    if (!confirm(`Send this newsletter to ${subscriberCount} subscribers?`)) {
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Convert HTML to plain text
      const textContent = htmlContent.replace(/<[^>]*>/g, '');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('newsletter_campaigns')
        .insert({
          title,
          subject,
          html_content: htmlContent,
          text_content: textContent,
          status: 'sending',
          created_by: session.user.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Trigger mass email sending
      const { error: sendError } = await supabase.functions.invoke('send-mass-email', {
        body: { campaignId: campaign.id },
      });

      if (sendError) throw sendError;

      toast.success('Newsletter is being sent in background!');
      navigate('/admin/settings?tab=newsletter');
    } catch (error: any) {
      console.error('Error sending newsletter:', error);
      toast.error(error.message || 'Failed to send newsletter');
    } finally {
      setLoading(false);
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean'],
    ],
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/settings?tab=newsletter')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/email-templates')}
                >
                  Browse Templates
                </Button>
              </div>
              <h1 className="text-2xl font-bold ml-4">Newsletter Composer</h1>
            </div>
          </div>

          <div className="p-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Newsletter</CardTitle>
                    <CardDescription>
                      Compose your newsletter with rich text editor. Use {'{name}'} and {'{email}'} for personalization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Campaign Title (Internal)</Label>
                      <Input
                        placeholder="e.g., Summer Promotion 2024"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email Subject</Label>
                      <Input
                        placeholder="e.g., 🏋️ New Classes This Summer!"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email Content</Label>
                      <div className="border rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={htmlContent}
                          onChange={setHtmlContent}
                          modules={modules}
                          className="h-96"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleSendNewsletter}
                      disabled={loading}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to {subscriberCount} Subscribers
                    </Button>
                    <Button
                      onClick={handleSaveDraft}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save as Draft
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="desktop">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="desktop">Desktop</TabsTrigger>
                        <TabsTrigger value="mobile">Mobile</TabsTrigger>
                      </TabsList>
                      <TabsContent value="desktop" className="mt-4">
                        <div className="border rounded-md p-4 bg-white min-h-[400px]">
                          <div className="text-sm text-muted-foreground mb-2">
                            Subject: {subject || 'No subject'}
                          </div>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: htmlContent || '<p>Start typing to see preview...</p>',
                            }}
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="mobile" className="mt-4">
                        <div className="border rounded-md p-2 bg-white max-w-[375px] mx-auto min-h-[400px]">
                          <div className="text-xs text-muted-foreground mb-2">
                            Subject: {subject || 'No subject'}
                          </div>
                          <div
                            className="text-sm"
                            dangerouslySetInnerHTML={{
                              __html: htmlContent || '<p>Start typing to see preview...</p>',
                            }}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• Use {'{name}'} to personalize with subscriber name</p>
                    <p>• Use {'{email}'} to insert subscriber email</p>
                    <p>• Keep subject lines under 50 characters</p>
                    <p>• Test your newsletter before sending</p>
                    <p>• Add clear call-to-action buttons</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
