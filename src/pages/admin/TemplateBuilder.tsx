import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { ComponentPalette } from '@/components/template-builder/ComponentPalette';
import { BuilderCanvas } from '@/components/template-builder/BuilderCanvas';
import { PropertiesPanel } from '@/components/template-builder/PropertiesPanel';

interface ComponentData {
  id: string;
  type: string;
  props: any;
}

export default function TemplateBuilder() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');

  useEffect(() => {
    checkAuth();
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

  const generateId = () => `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddComponent = (componentType: any) => {
    const newComponent: ComponentData = {
      id: generateId(),
      type: componentType.type,
      props: { ...componentType.defaultProps },
    };
    setComponents([...components, newComponent]);
    setSelectedComponent(newComponent);
  };

  const handleReorderComponents = (reorderedComponents: ComponentData[]) => {
    setComponents(reorderedComponents);
  };

  const handleRemoveComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  };

  const handleSelectComponent = (component: ComponentData) => {
    setSelectedComponent(component);
  };

  const handleUpdateComponent = (id: string, newProps: any) => {
    setComponents(
      components.map((c) => (c.id === id ? { ...c, props: newProps } : c))
    );
    if (selectedComponent?.id === id) {
      setSelectedComponent({ ...selectedComponent, props: newProps });
    }
  };

  const generateHtml = () => {
    const componentHtml = components
      .map((component) => {
        switch (component.type) {
          case 'heading':
            return `<h${component.props.level} style="text-align: ${component.props.align}; color: ${component.props.color}; margin: 0 0 20px 0;">${component.props.text}</h${component.props.level}>`;
          
          case 'text':
            return `<p style="text-align: ${component.props.align}; color: ${component.props.color}; font-size: ${component.props.fontSize}px; line-height: 1.6; margin: 0 0 20px 0;">${component.props.text}</p>`;
          
          case 'image':
            return `<img src="${component.props.src}" alt="${component.props.alt}" style="width: ${component.props.width}; display: block; margin: 0 auto 20px auto;" />`;
          
          case 'button':
            return `<div style="text-align: ${component.props.align}; margin: 20px 0;"><a href="${component.props.url}" style="display: inline-block; padding: 15px 40px; background-color: ${component.props.backgroundColor}; color: ${component.props.textColor}; text-decoration: none; border-radius: ${component.props.borderRadius}px; font-size: 16px;">${component.props.text}</a></div>`;
          
          case 'divider':
            return `<hr style="border: none; height: ${component.props.height}px; background-color: ${component.props.color}; margin: ${component.props.margin}px 0;" />`;
          
          case 'columns':
            const columnContent = Array.from({ length: component.props.columns })
              .map((_, i) => `<div style="flex: 1; padding: 20px;"><p style="color: #666;">Column ${i + 1} - Add content here</p></div>`)
              .join('');
            return `<div style="display: flex; gap: ${component.props.gap}px; margin: 20px 0;">${columnContent}</div>`;
          
          default:
            return '';
        }
      })
      .join('');

    return `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 40px 20px;">
      ${componentHtml}
      <div style="background: #f7fafc; padding: 20px; text-align: center; color: #999; font-size: 14px; margin-top: 40px;">
        <p>© 2024 Your Gym. All rights reserved.</p>
      </div>
    </div>`;
  };

  const handlePreview = () => {
    const html = generateHtml();
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!templateName) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const html = generateHtml();

      const { error } = await supabase.from('email_templates').insert({
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        html_template: html,
        is_system: false,
        created_by: session.user.id,
      });

      if (error) throw error;

      toast.success('Template saved successfully!');
      setSaveDialogOpen(false);
      navigate('/admin/email-templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  };

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center">
                <SidebarTrigger />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/email-templates')}
                  className="ml-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-2xl font-bold ml-4">Template Builder</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-12 gap-6 h-[calc(100vh-88px)]">
            <div className="col-span-2">
              <ComponentPalette onAddComponent={handleAddComponent} />
            </div>
            <div className="col-span-7">
              <BuilderCanvas
                components={components}
                onReorder={handleReorderComponents}
                onRemove={handleRemoveComponent}
                onSelect={handleSelectComponent}
                selectedId={selectedComponent?.id}
              />
            </div>
            <div className="col-span-3">
              <PropertiesPanel
                component={selectedComponent}
                onUpdate={handleUpdateComponent}
              />
            </div>
          </div>
        </main>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>
              Give your template a name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Summer Promotion"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                placeholder="promotion, event, announcement, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md p-6 bg-white">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
