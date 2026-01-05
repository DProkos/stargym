import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { GripVertical, Save, Navigation, Eye, EyeOff } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NavItem {
  key: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
}

interface SortableNavItemProps {
  item: NavItem;
  onLabelChange: (key: string, label: string) => void;
  onVisibilityChange: (key: string, visible: boolean) => void;
}

const SortableNavItem = ({ item, onLabelChange, onVisibilityChange }: SortableNavItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border ${isDragging ? 'border-primary' : 'border-border'}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-primary"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1">
        <Input
          value={item.label}
          onChange={(e) => onLabelChange(item.key, e.target.value)}
          className="h-8 text-sm"
          placeholder="Όνομα στο menu"
        />
      </div>
      
      <div className="text-xs text-muted-foreground min-w-[80px]">
        {item.path}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onVisibilityChange(item.key, !item.visible)}
        className={item.visible ? 'text-primary' : 'text-muted-foreground'}
      >
        {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
    </div>
  );
};

// Default navigation structure
const DEFAULT_NAV_CONFIG: Record<string, { label: string; path: string }> = {
  home: { label: 'Αρχική', path: '/' },
  classes: { label: 'Μαθήματα', path: '/classes' },
  memberships: { label: 'Συνδρομές', path: '/memberships' },
  pricing: { label: 'Τιμές', path: '/pricing' },
  contact: { label: 'Επικοινωνία', path: '/contact' },
};

export const NavigationManager = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadNavigationConfig();
  }, []);

  const loadNavigationConfig = async () => {
    setLoading(true);
    
    // Get existing page keys from database
    const { data: pagesData } = await supabase
      .from('page_sections')
      .select('page_key')
      .eq('is_visible', true);

    const existingPageKeys = [...new Set(pagesData?.map(d => d.page_key) || [])];

    // Get saved nav config from site_settings
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['nav_order', 'nav_labels', 'nav_visibility']);

    let navOrder: string[] = [];
    let navLabels: Record<string, string> = {};
    let navVisibility: Record<string, boolean> = {};

    settingsData?.forEach(setting => {
      try {
        if (setting.setting_key === 'nav_order' && setting.setting_value) {
          navOrder = JSON.parse(setting.setting_value);
        }
        if (setting.setting_key === 'nav_labels' && setting.setting_value) {
          navLabels = JSON.parse(setting.setting_value);
        }
        if (setting.setting_key === 'nav_visibility' && setting.setting_value) {
          navVisibility = JSON.parse(setting.setting_value);
        }
      } catch (e) {
        console.error('Error parsing nav setting:', e);
      }
    });

    // Build nav items list
    const items: NavItem[] = [];
    
    // First, add items in saved order
    navOrder.forEach((key, index) => {
      if (existingPageKeys.includes(key)) {
        const defaultConfig = DEFAULT_NAV_CONFIG[key];
        items.push({
          key,
          label: navLabels[key] || defaultConfig?.label || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
          path: defaultConfig?.path || `/page/${key}`,
          visible: navVisibility[key] !== false,
          order: index,
        });
      }
    });

    // Then add any new pages not in saved order
    existingPageKeys.forEach(key => {
      if (!items.find(i => i.key === key)) {
        const defaultConfig = DEFAULT_NAV_CONFIG[key];
        items.push({
          key,
          label: navLabels[key] || defaultConfig?.label || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
          path: defaultConfig?.path || `/page/${key}`,
          visible: navVisibility[key] !== false,
          order: items.length,
        });
      }
    });

    setNavItems(items);
    setLoading(false);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex(i => i.key === active.id);
        const newIndex = items.findIndex(i => i.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleLabelChange = (key: string, label: string) => {
    setNavItems(items => 
      items.map(item => 
        item.key === key ? { ...item, label } : item
      )
    );
  };

  const handleVisibilityChange = (key: string, visible: boolean) => {
    setNavItems(items => 
      items.map(item => 
        item.key === key ? { ...item, visible } : item
      )
    );
  };

  const saveNavigationConfig = async () => {
    setSaving(true);

    const navOrder = navItems.map(i => i.key);
    const navLabels: Record<string, string> = {};
    const navVisibility: Record<string, boolean> = {};

    navItems.forEach(item => {
      navLabels[item.key] = item.label;
      navVisibility[item.key] = item.visible;
    });

    // Upsert each setting
    const settings = [
      { setting_key: 'nav_order', setting_value: JSON.stringify(navOrder), setting_type: 'json', category: 'navigation' },
      { setting_key: 'nav_labels', setting_value: JSON.stringify(navLabels), setting_type: 'json', category: 'navigation' },
      { setting_key: 'nav_visibility', setting_value: JSON.stringify(navVisibility), setting_type: 'json', category: 'navigation' },
    ];

    for (const setting of settings) {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('setting_key', setting.setting_key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('site_settings')
          .update({ setting_value: setting.setting_value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('site_settings')
          .insert(setting);
      }
    }

    setSaving(false);
    toast.success('Οι ρυθμίσεις navigation αποθηκεύτηκαν');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Φόρτωση...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Διαχείριση Navigation Menu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Σύρετε τις σελίδες για να αλλάξετε τη σειρά τους. Μπορείτε επίσης να αλλάξετε το όνομα και την ορατότητα κάθε σελίδας.
        </p>

        {navItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Δεν υπάρχουν σελίδες. Δημιουργήστε πρώτα σελίδες με sections.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={navItems.map(i => i.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {navItems.map((item) => (
                  <SortableNavItem
                    key={item.key}
                    item={item}
                    onLabelChange={handleLabelChange}
                    onVisibilityChange={handleVisibilityChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button 
          onClick={saveNavigationConfig} 
          disabled={saving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Αποθήκευση...' : 'Αποθήκευση Navigation'}
        </Button>
      </CardContent>
    </Card>
  );
};
