import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Trash2, Eye, EyeOff, Type, Sparkles, Square, ImageIcon, Phone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageSection {
  id: string;
  section_key: string;
  section_type: string;
  title: string | null;
  is_visible: boolean;
}

interface SortableSectionItemProps {
  section: PageSection;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

const SECTION_ICONS: Record<string, any> = {
  hero: Sparkles,
  header: Type,
  text: FileText,
  features: Square,
  cta: Sparkles,
  image: ImageIcon,
  contact_form: Phone,
  contact_info: Phone,
};

export function SortableSectionItem({
  section,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisibility,
}: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = SECTION_ICONS[section.section_type] || Square;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        isDragging ? 'opacity-50' : '',
        !section.is_visible && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <Icon className="h-4 w-4 text-muted-foreground" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {section.title || section.section_type}
        </p>
        <p className="text-xs text-muted-foreground">{section.section_type}</p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
      >
        {section.is_visible ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}