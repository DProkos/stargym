import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Layout, 
  Palette, 
  Eye, 
  Plus,
  Trash2,
  Image as ImageIcon,
  Type,
  Square,
  Sparkles,
  Phone,
  FileText,
  FilePlus,
  Package,
  Layers,
  Navigation
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSectionItem } from '@/components/page-builder/SortableSectionItem';
import { SectionEditor } from '@/components/page-builder/SectionEditor';
import { SiteSettingsEditor } from '@/components/page-builder/SiteSettingsEditor';
import { LivePreview } from '@/components/page-builder/LivePreview';
import { PagePreview } from '@/components/page-builder/PagePreview';
import { SectionTemplates, SectionTemplate } from '@/components/page-builder/SectionTemplates';
import { NavigationManager } from '@/components/page-builder/NavigationManager';

interface PageSection {
  id: string;
  page_key: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  title_en: string | null;
  title_el: string | null;
  subtitle_en: string | null;
  subtitle_el: string | null;
  content_en: string | null;
  content_el: string | null;
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

interface PageInfo {
  key: string;
  label: string;
}

const DEFAULT_PAGES: PageInfo[] = [
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
  { type: 'packages', label: 'Πακέτα Υπηρεσιών', icon: Package },
  { type: 'matterport', label: '3D Tour (Matterport)', icon: Eye },
  { type: 'contact_form', label: 'Contact Form', icon: Phone },
  { type: 'contact_info', label: 'Contact Info', icon: Phone },
  { type: 'social', label: 'Social Media', icon: Layers },
];

export default function PageBuilder() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('home');
  const [activeTab, setActiveTab] = useState('sections');
  const [sections, setSections] = useState<PageSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [selectedSection, setSelectedSection] = useState<PageSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [pages, setPages] = useState<PageInfo[]>(DEFAULT_PAGES);
  const [newPageName, setNewPageName] = useState('');
  const [newPageKey, setNewPageKey] = useState('');
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [showDeletePageDialog, setShowDeletePageDialog] = useState(false);

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
      .maybeSingle();

    if (!data) {
      navigate('/');
      toast.error('Δεν έχετε δικαίωμα πρόσβασης');
      return;
    }

    loadSiteSettings();
    loadPages();
    loadSections();
  };

  const loadPages = async () => {
    // Get all unique page_keys from page_sections
    const { data, error } = await supabase
      .from('page_sections')
      .select('page_key');

    if (error) {
      console.error('Error loading pages:', error);
      // On error, use default pages
      setPages(DEFAULT_PAGES);
      return;
    }

    // Get unique page keys that have sections in the database
    const existingPageKeys = [...new Set(data?.map(d => d.page_key) || [])];
    
    // Only show pages that actually have sections in the database
    const allPages: PageInfo[] = [];
    
    // First add default pages that exist in database
    DEFAULT_PAGES.forEach(page => {
      if (existingPageKeys.includes(page.key)) {
        allPages.push(page);
      }
    });
    
    // Then add any custom pages that exist in database but not in defaults
    existingPageKeys.forEach(key => {
      if (!allPages.find(p => p.key === key)) {
        allPages.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
        });
      }
    });

    // If no pages exist yet, show default pages so user can create sections
    if (allPages.length === 0) {
      setPages(DEFAULT_PAGES);
    } else {
      setPages(allPages);
    }
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
      const updatedSections = newSections.map((section, index) => ({
        ...section,
        sort_order: index,
      }));
      
      setSections(updatedSections);

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

  const applyTemplate = async (template: SectionTemplate) => {
    const newSectionKey = `${template.section_type}_${Date.now()}`;
    const newSection = {
      page_key: activePage,
      section_key: newSectionKey,
      section_type: template.section_type,
      title: template.preview_data.title || null,
      title_en: template.preview_data.title_en || null,
      title_el: template.preview_data.title_el || null,
      subtitle: template.preview_data.subtitle || null,
      subtitle_en: template.preview_data.subtitle_en || null,
      subtitle_el: template.preview_data.subtitle_el || null,
      content: template.preview_data.content || null,
      content_en: template.preview_data.content_en || null,
      content_el: template.preview_data.content_el || null,
      image_url: null,
      background_color: template.preview_data.background_color || 'default',
      text_color: template.preview_data.text_color || 'default',
      settings: template.preview_data.settings || {},
      sort_order: sections.length,
      is_visible: true,
    };

    const { data, error } = await supabase
      .from('page_sections')
      .insert(newSection)
      .select()
      .single();

    if (error) {
      toast.error('Σφάλμα προσθήκης template');
      console.error(error);
    } else {
      setSections([...sections, data]);
      setSelectedSection(data);
      setActiveTab('sections');
      toast.success(`Το template "${template.name}" προστέθηκε`);
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

  const createNewPage = async () => {
    if (!newPageName.trim() || !newPageKey.trim()) {
      toast.error('Συμπληρώστε όνομα και key σελίδας');
      return;
    }

    const pageKey = newPageKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (pages.find(p => p.key === pageKey)) {
      toast.error('Υπάρχει ήδη σελίδα με αυτό το key');
      return;
    }

    // Create a default header section for the new page
    const { error } = await supabase
      .from('page_sections')
      .insert({
        page_key: pageKey,
        section_key: 'header',
        section_type: 'header',
        title: newPageName,
        subtitle: 'New page subtitle',
        background_color: 'default',
        text_color: 'default',
        settings: {},
        sort_order: 0,
        is_visible: true,
      });

    if (error) {
      toast.error('Σφάλμα δημιουργίας σελίδας');
      console.error(error);
    } else {
      const newPage: PageInfo = {
        key: pageKey,
        label: newPageName,
      };
      setPages([...pages, newPage]);
      setActivePage(pageKey);
      setNewPageName('');
      setNewPageKey('');
      setShowNewPageDialog(false);
      toast.success('Η σελίδα δημιουργήθηκε');
    }
  };

  const deletePage = async () => {
    // Delete all sections for this page
    const { error } = await supabase
      .from('page_sections')
      .delete()
      .eq('page_key', activePage);

    if (error) {
      toast.error('Σφάλμα διαγραφής σελίδας');
      console.error(error);
    } else {
      setPages(pages.filter(p => p.key !== activePage));
      setActivePage(pages.find(p => p.key !== activePage)?.key || 'home');
      setShowDeletePageDialog(false);
      toast.success('Η σελίδα διαγράφηκε');
    }
  };

  const updateSiteSetting = async (settingKey: string, value: string | null) => {
    // First try to update
    const { data: existingData, error: selectError } = await supabase
      .from('site_settings')
      .select('id')
      .eq('setting_key', settingKey)
      .maybeSingle();

    let error;
    
    if (existingData) {
      // Update existing
      const result = await supabase
        .from('site_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', settingKey);
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from('site_settings')
        .insert({ 
          setting_key: settingKey, 
          setting_value: value,
          setting_type: 'text',
          category: 'branding'
        });
      error = result.error;
    }

    if (error) {
      toast.error('Σφάλμα ενημέρωσης ρύθμισης');
      console.error(error);
    } else {
      // Update local state
      const existingSetting = siteSettings.find(s => s.setting_key === settingKey);
      if (existingSetting) {
        setSiteSettings(siteSettings.map(s => 
          s.setting_key === settingKey ? { ...s, setting_value: value } : s
        ));
      } else {
        setSiteSettings([...siteSettings, {
          id: crypto.randomUUID(),
          setting_key: settingKey,
          setting_value: value,
          setting_type: 'text',
          category: 'branding'
        }]);
      }
      toast.success('Η ρύθμιση αποθηκεύτηκε');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1 overflow-auto">
          <div className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
                    <Layout className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
                    Page Builder
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Επεξεργαστείτε τις σελίδες του site με drag & drop
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" className="text-xs sm:text-sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Live</span> Edit
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 flex flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="sections" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <Layout className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Sections</span>
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Templates</span>
                </TabsTrigger>
                <TabsTrigger value="navigation" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <Navigation className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Nav</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="navigation">
                <NavigationManager />
              </TabsContent>

              <TabsContent value="sections">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Left Panel - Page & Section List */}
                  <div className="space-y-3 sm:space-y-4">
                    <Card>
                      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                        <CardTitle className="text-sm flex items-center justify-between">
                          Επιλογή Σελίδας
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNewPageDialog(true)}
                          >
                            <FilePlus className="h-4 w-4 mr-1" />
                            Νέα
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select value={activePage} onValueChange={setActivePage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pages.map(page => (
                              <SelectItem key={page.key} value={page.key}>
                                {page.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowDeletePageDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Διαγραφή Σελίδας
                        </Button>
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
                      <Card className="h-full flex items-center justify-center min-h-[300px]">
                        <div className="text-center text-muted-foreground">
                          <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Επιλέξτε ένα section για επεξεργασία</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="templates">
                <SectionTemplates
                  activePage={activePage}
                  onApplyTemplate={applyTemplate}
                />
              </TabsContent>

              <TabsContent value="settings">
                <SiteSettingsEditor
                  settings={siteSettings}
                  onUpdate={updateSiteSetting}
                />
              </TabsContent>
            </Tabs>

            {/* Live Preview with Visual Editing */}
            {showPreview && (
              <LivePreview
                pageKey={activePage}
                sections={sections}
                siteSettings={siteSettings}
                onClose={() => setShowPreview(false)}
                onUpdateSection={updateSection}
              />
            )}

            {/* New Page Dialog */}
            <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Δημιουργία Νέας Σελίδας</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Όνομα Σελίδας</Label>
                    <Input
                      value={newPageName}
                      onChange={(e) => {
                        setNewPageName(e.target.value);
                        setNewPageKey(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                      }}
                      placeholder="π.χ. Υπηρεσίες"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Key</Label>
                    <Input
                      value={newPageKey}
                      onChange={(e) => setNewPageKey(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                      placeholder="π.χ. services"
                    />
                    <p className="text-xs text-muted-foreground">
                      Η σελίδα θα είναι διαθέσιμη στο: /{newPageKey || 'page-key'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewPageDialog(false)}>
                    Ακύρωση
                  </Button>
                  <Button onClick={createNewPage}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    Δημιουργία
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Page Confirmation */}
            <AlertDialog open={showDeletePageDialog} onOpenChange={setShowDeletePageDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Διαγραφή Σελίδας</AlertDialogTitle>
                  <AlertDialogDescription>
                    Είστε σίγουροι ότι θέλετε να διαγράψετε τη σελίδα "{pages.find(p => p.key === activePage)?.label}"? 
                    Θα διαγραφούν όλα τα sections ({sections.length}) που περιέχει.
                    Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                  <AlertDialogAction onClick={deletePage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Διαγραφή
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}