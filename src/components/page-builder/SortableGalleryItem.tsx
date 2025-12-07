import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

interface GalleryImage {
  src: string;
  alt: string;
}

interface SortableGalleryItemProps {
  id: string;
  index: number;
  image: GalleryImage;
  onImageUpdate: (index: number, field: 'src' | 'alt', value: string) => void;
  onImageDelete: (index: number) => void;
}

export function SortableGalleryItem({ 
  id, 
  index, 
  image, 
  onImageUpdate, 
  onImageDelete 
}: SortableGalleryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-3">
      <div className="flex gap-3 items-start">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        {image.src && (
          <img src={image.src} alt={image.alt} className="w-20 h-14 object-cover rounded" />
        )}
        <div className="flex-1 space-y-2">
          <ImageUpload
            currentImageUrl={image.src}
            onImageUploaded={(url) => onImageUpdate(index, 'src', url)}
            bucket="cms-images"
            folder="gallery"
          />
          <Input
            value={image.alt}
            onChange={(e) => onImageUpdate(index, 'alt', e.target.value)}
            placeholder="Περιγραφή εικόνας..."
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive"
          onClick={() => onImageDelete(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
