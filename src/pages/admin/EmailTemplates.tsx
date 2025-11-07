import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Copy, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  html_template: string;
  is_system: boolean;
}

export default function EmailTemplates() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    loadTemplates();
  }, []);

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
      .single();

    if (roleData?.role !== 'admin') {
      navigate('/');
      return;
    }

    setIsAdmin(true);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
      return;
    }

    setTemplates(data || []);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    navigate('/admin/newsletter', { state: { template: template.html_template } });
  };

  const handleDeleteTemplate = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error('Cannot delete system templates');
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete template');
      return;
    }

    toast.success('Template deleted');
    loadTemplates();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'promotion': return 'bg-purple-500/20 text-purple-300';
      case 'event': return 'bg-pink-500/20 text-pink-300';
      case 'announcement': return 'bg-blue-500/20 text-blue-300';
      case 'welcome': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'promotion': return '🎉';
      case 'event': return '🎊';
      case 'announcement': return '📢';
      case 'welcome': return '👋';
      default: return '📧';
    }
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/settings?tab=newsletter')}
                className="ml-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold ml-4">Email Templates</h1>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <Button onClick={() => navigate('/admin/newsletter')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Blank Newsletter
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span>{getCategoryIcon(template.category)}</span>
                          {template.name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      {template.is_system && (
                        <Badge variant="outline">System</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border rounded-md p-4 bg-white h-48 overflow-hidden relative"
                      style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166%', height: '200px' }}
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: template.html_template }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!template.is_system && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id, template.is_system)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md p-6 bg-white">
            {selectedTemplate && (
              <div dangerouslySetInnerHTML={{ __html: selectedTemplate.html_template }} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
