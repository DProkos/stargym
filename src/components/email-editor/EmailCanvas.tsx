import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { EmailBlock } from './EmailBlockEditor';

interface EmailCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId?: string;
  onSelectBlock: (block: EmailBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
}

export const EmailCanvas = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
}: EmailCanvasProps) => {
  if (blocks.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
        <p>Drag blocks here to start building your email</p>
        <p className="text-sm mt-2">Σύρετε blocks εδώ για να ξεκινήσετε</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 min-h-[400px]">
      {blocks.map((block) => (
        <SortableBlock
          key={block.id}
          block={block}
          isSelected={selectedBlockId === block.id}
          onSelect={() => onSelectBlock(block)}
          onDelete={() => onDeleteBlock(block.id)}
          onDuplicate={() => onDuplicateBlock(block.id)}
        />
      ))}
    </div>
  );
};

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const SortableBlock = ({ block, isSelected, onSelect, onDelete, onDuplicate }: SortableBlockProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Card
        className={`p-4 cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-muted'
        }`}
        onClick={onSelect}
      >
        <div className="flex items-start gap-2">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="flex-1">
            <BlockPreview block={block} />
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const BlockPreview = ({ block }: { block: EmailBlock }) => {
  switch (block.type) {
    case 'header':
      return (
        <h3 style={{ color: block.content.color, fontSize: block.content.fontSize, margin: 0 }}>
          {block.content.text}
        </h3>
      );
    
    case 'text':
      return (
        <p style={{ color: block.content.color, fontSize: block.content.fontSize, margin: 0 }}>
          {block.content.text}
        </p>
      );
    
    case 'button':
      return (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '8px 20px',
              backgroundColor: block.content.bgColor,
              color: block.content.textColor,
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {block.content.text}
          </span>
        </div>
      );
    
    case 'image':
      return (
        <div style={{ textAlign: 'center' }}>
          {block.content.url ? (
            <img src={block.content.url} alt={block.content.alt} style={{ maxWidth: '100%', height: 'auto' }} />
          ) : (
            <div className="border-2 border-dashed rounded p-4 text-muted-foreground text-sm">
              No image selected
            </div>
          )}
        </div>
      );
    
    case 'divider':
      return <hr style={{ borderTop: `${block.content.height} solid ${block.content.color}`, margin: '10px 0' }} />;
    
    case 'spacer':
      return <div style={{ height: block.content.height, backgroundColor: '#f5f5f5' }}></div>;
    
    case 'list':
      return (
        <ul style={{ color: block.content.color, paddingLeft: '20px', margin: 0 }}>
          {block.content.items.map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    
    default:
      return <div>Unknown block type</div>;
  }
};
