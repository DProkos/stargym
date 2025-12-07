import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Layout, 
  Palette, 
  Settings, 
  Eye, 
  Save,
  GripVertical,
  Plus,
  Trash2,
  Image as ImageIcon,
  Type,
  Square,
  Sparkles,
  Phone,
  FileText
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSectionItem } from '@/components/page-builder/SortableSectionItem';
import { SectionEditor } from '@/components/page-builder/SectionEditor';
import { SiteSettingsEditor } from '@/components/page-builder/SiteSettingsEditor';
import { PagePreview } from '@/components/page-builder/PagePreview';

interface PageSection {
  id: string;
  page_key: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  background_color: string;
  text_color: string;
  settings: any;
  sort_order: number;
  is_visible: boolean;
}

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  category: string;
}

const PAGES = [
  { key: 'home', label: 'Αρχική' },
  { key: 'contact', label: 'Επικοινωνία' },
  { key: 'classes', label: 'Μαθήματα' },
  { key: 'memberships', label: 'Συνδρομές' },
  { key: 'pricing', label: 'Τιμές' },
];

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero Section', icon: Sparkles },
  { type: 'header', label: 'Header', icon: Type },
  { type: 'text', label: 'Text Block', icon: FileText },
  { type: 'features', label: 'Features Grid', icon: Square },
  { type: 'cta', label: 'Call to Action', icon: Sparkles },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'contact_form', label: 'Contact Form', icon: Phone },
  { type: 'contact_info', label: 'Contact Info', icon: Phone },
];

export default function PageBuilder() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('home');
  const [activeTab, setActiveTab] = useState('sections');
  const [sections, setSections] = useState<PageSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [selectedSection, setSelectedSection] = useState<PageSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    loadSections();
  }, [activePage]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!data) {
      navigate('/');
      toast.error('Δεν έχετε δικαίωμα πρόσβασης');
      return;
    }

    loadSiteSettings();
    loadSections();
  };

  const loadSections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('page_sections')
      .select('*')
      .eq('page_key', activePage)
      .order('sort_order');

    if (error) {
      toast.error('Σφάλμα φόρτωσης sections');
      console.error(error);
    } else {
      setSections(data || []);
    }
    setLoading(false);
  };

  const loadSiteSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('category');

    if (error) {
      toast.error('Σφάλμα φόρτωσης ρυθμίσεων');
      console.error(error);
    } else {
      setSiteSettings(data || []);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      
      const newSections = arrayMove(sections, oldIndex, newIndex);
      
      // Update sort_order for all affected sections
      const updatedSections = newSections.map((section, index) => ({
        ...section,
        sort_order: index,
      }));
      
      setSections(updatedSections);

      // Save to database
      for (const section of updatedSections) {
        await supabase
          .from('page_sections')
          .update({ sort_order: section.sort_order })
          .eq('id', section.id);
      }
      
      toast.success('Η σειρά ενημερώθηκε');
    }
  };

  const addSection = async (sectionType: string) => {
    const newSectionKey = `${sectionType}_${Date.now()}`;
    const newSection = {
      page_key: activePage,
      section_key: newSectionKey,
      section_type: sectionType,
      title: 'New Section',
      subtitle: null,
      content: null,
      image_url: null,
      background_color: 'default',
      text_color: 'default',
      settings: {},
      sort_order: sections.length,
      is_visible: true,
    };

    const { data, error } = await supabase
      .from('page_sections')
      .insert(newSection)
      .select()
      .single();

    if (error) {
      toast.error('Σφάλμα δημιουργίας section');
      console.error(error);
    } else {
      setSections([...sections, data]);
      setSelectedSection(data);
      toast.success('Το section προστέθηκε');
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<PageSection>) => {
    const { error } = await supabase
      .from('page_sections')
      .update(updates)
      .eq('id', sectionId);

    if (error) {
      toast.error('Σφάλμα ενημέρωσης');
      console.error(error);
    } else {
      setSections(sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      ));
      if (selectedSection?.id === sectionId) {
        setSelectedSection({ ...selectedSection, ...updates });
      }
      toast.success('Αποθηκεύτηκε');
    }
  };

  const deleteSection = async (sectionId: string) => {
    const { error } = await supabase
      .from('page_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      toast.error('Σφάλμα διαγραφής');
      console.error(error);
    } else {
      setSections(sections.filter(s => s.id !== sectionId));
      if (selectedSection?.id === sectionId) {
        setSelectedSection(null);
      }
      toast.success('Το section διαγράφηκε');
    }
  };

  const updateSiteSetting = async (settingKey: string, value: string | null) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ setting_value: value })
      .eq('setting_key', settingKey);

    if (error) {
      toast.error('Σφάλμα ενημέρωσης ρύθμισης');
      console.error(error);
    } else {
      setSiteSettings(siteSettings.map(s => 
        s.setting_key === settingKey ? { ...s, setting_value: value } : s
      ));
      toast.success('Η ρύθμιση αποθηκεύτηκε');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Layout className="h-8 w-8 text-primary" />
                    Page Builder
                  </h1>
                  <p className="text-muted-foreground">
                    Επεξεργαστείτε τις σελίδες του site με drag & drop
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Κλείσιμο Preview' : 'Preview'}
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="sections" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Sections
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Ρυθμίσεις Site
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sections">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Panel - Page & Section List */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Επιλογή Σελίδας</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={activePage} onValueChange={setActivePage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGES.map(page => (
                              <SelectItem key={page.key} value={page.key}>
                                {page.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          Sections
                          <Select onValueChange={addSection}>
                            <SelectTrigger className="w-[140px] h-8">
                              <Plus className="h-4 w-4 mr-1" />
                              <span className="text-xs">Προσθήκη</span>
                            </SelectTrigger>
                            <SelectContent>
                              {SECTION_TYPES.map(type => (
                                <SelectItem key={type.type} value={type.type}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        {loading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Φόρτωση...
                          </div>
                        ) : sections.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Δεν υπάρχουν sections
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={sections.map(s => s.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-1">
                                {sections.map((section) => (
                                  <SortableSectionItem
                                    key={section.id}
                                    section={section}
                                    isSelected={selectedSection?.id === section.id}
                                    onSelect={() => setSelectedSection(section)}
                                    onDelete={() => deleteSection(section.id)}
                                    onToggleVisibility={() => updateSection(section.id, { is_visible: !section.is_visible })}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Middle Panel - Section Editor */}
                  <div className="lg:col-span-2">
                    {selectedSection ? (
                      <SectionEditor
                        section={selectedSection}
                        onUpdate={(updates) => updateSection(selectedSection.id, updates)}
                      />
                    ) : (
                      <Card className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Επιλέξτε ένα section για επεξεργασία</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <SiteSettingsEditor
                  settings={siteSettings}
                  onUpdate={updateSiteSetting}
                />
              </TabsContent>
            </Tabs>

            {/* Preview Modal */}
            {showPreview && (
              <PagePreview
                pageKey={activePage}
                sections={sections}
                siteSettings={siteSettings}
                onClose={() => setShowPreview(false)}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}