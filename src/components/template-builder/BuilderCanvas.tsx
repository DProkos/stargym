import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ComponentData {
  id: string;
  type: string;
  props: any;
}

interface BuilderCanvasProps {
  components: ComponentData[];
  onReorder: (components: ComponentData[]) => void;
  onRemove: (id: string) => void;
  onSelect: (component: ComponentData) => void;
  selectedId?: string;
}

function SortableComponent({ 
  component, 
  onRemove, 
  onSelect, 
  isSelected 
}: { 
  component: ComponentData; 
  onRemove: (id: string) => void;
  onSelect: (component: ComponentData) => void;
  isSelected: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderComponent = () => {
    switch (component.type) {
      case 'heading':
        return (
          <h1
            style={{
              fontSize: component.props.level === 1 ? '32px' : '24px',
              textAlign: component.props.align,
              color: component.props.color,
              margin: 0,
            }}
          >
            {component.props.text}
          </h1>
        );
      case 'text':
        return (
          <p
            style={{
              textAlign: component.props.align,
              color: component.props.color,
              fontSize: `${component.props.fontSize}px`,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {component.props.text}
          </p>
        );
      case 'image':
        return (
          <img
            src={component.props.src}
            alt={component.props.alt}
            style={{ width: component.props.width, display: 'block', margin: '0 auto' }}
          />
        );
      case 'button':
        return (
          <div style={{ textAlign: component.props.align }}>
            <a
              href={component.props.url}
              style={{
                display: 'inline-block',
                padding: '15px 40px',
                backgroundColor: component.props.backgroundColor,
                color: component.props.textColor,
                textDecoration: 'none',
                borderRadius: `${component.props.borderRadius}px`,
                fontSize: '16px',
              }}
            >
              {component.props.text}
            </a>
          </div>
        );
      case 'divider':
        return (
          <hr
            style={{
              border: 'none',
              height: `${component.props.height}px`,
              backgroundColor: component.props.color,
              margin: `${component.props.margin}px 0`,
            }}
          />
        );
      case 'columns':
        return (
          <div
            style={{
              display: 'flex',
              gap: `${component.props.gap}px`,
            }}
          >
            {Array.from({ length: component.props.columns }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: '20px',
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                }}
              >
                Column {i + 1}
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative p-4 rounded-lg border-2 transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted'
      }`}
      onClick={() => onSelect(component)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1">{renderComponent()}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(component.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function BuilderCanvas({ 
  components, 
  onReorder, 
  onRemove, 
  onSelect,
  selectedId 
}: BuilderCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      onReorder(arrayMove(components, oldIndex, newIndex));
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="bg-white rounded-lg p-8 min-h-[600px]" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {components.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Click on components from the palette to start building</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={components.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {components.map((component) => (
                    <SortableComponent
                      key={component.id}
                      component={component}
                      onRemove={onRemove}
                      onSelect={onSelect}
                      isSelected={selectedId === component.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
