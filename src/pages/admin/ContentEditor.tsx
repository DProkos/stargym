import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";

interface ContentBlock {
  id: string;
  key: string;
  title: string;
  content: string;
  image_url?: string;
  metadata: any;
}

export default function ContentEditor() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .order('key');

      if (error) throw error;

      if (data) {
        setBlocks(data);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading content',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBlock = async (block: ContentBlock) => {
    setSaving(block.id);
    try {
      const { error } = await supabase
        .from('content_blocks')
        .update({
          title: block.title,
          content: block.content,
          image_url: block.image_url,
        })
        .eq('id', block.id);

      if (error) throw error;

      toast({
        title: 'Content updated',
        description: 'Your changes have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating content',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updateBlockField = (id: string, field: keyof ContentBlock, value: any) => {
    setBlocks(prev =>
      prev.map(block =>
        block.id === id ? { ...block, [field]: value } : block
      )
    );
  };

  const getSectionBlocks = (section: string) => {
    return blocks.filter(block => block.metadata?.section === section);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">Content Management</h1>
          </header>

          <main className="p-6">
            <div className="max-w-4xl mx-auto">
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Content Editor</h2>
        <p className="text-muted-foreground">Edit website content and text</p>
      </div>

      {/* Hero Section */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>Main homepage hero content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {getSectionBlocks('hero').map(block => (
            <div key={block.id} className="space-y-3">
              <Label>{block.title}</Label>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlockField(block.id, 'content', e.target.value)}
                rows={block.key.includes('subtitle') ? 2 : 1}
                className="bg-secondary border-border"
              />
              <Button
                onClick={() => handleUpdateBlock(block)}
                disabled={saving === block.id}
                size="sm"
              >
                {saving === block.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save</>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* About Section */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>About Section</CardTitle>
          <CardDescription>About page content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {getSectionBlocks('about').map(block => (
            <div key={block.id} className="space-y-3">
              <Label>{block.title}</Label>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlockField(block.id, 'content', e.target.value)}
                rows={3}
                className="bg-secondary border-border"
              />
              <Button
                onClick={() => handleUpdateBlock(block)}
                disabled={saving === block.id}
                size="sm"
              >
                {saving === block.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save</>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Contact page details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {getSectionBlocks('contact').concat(getSectionBlocks('hours')).map(block => (
            <div key={block.id} className="space-y-3">
              <Label>{block.title}</Label>
              <Input
                value={block.content}
                onChange={(e) => updateBlockField(block.id, 'content', e.target.value)}
                className="bg-secondary border-border"
              />
              <Button
                onClick={() => handleUpdateBlock(block)}
                disabled={saving === block.id}
                size="sm"
              >
                {saving === block.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save</>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
