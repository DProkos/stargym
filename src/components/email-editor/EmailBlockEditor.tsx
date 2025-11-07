import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailBlockPalette } from './EmailBlockPalette';
import { EmailCanvas } from './EmailCanvas';
import { EmailBlockPropertiesPanel } from './EmailBlockPropertiesPanel';
import { Eye, Code } from 'lucide-react';
import { toast } from 'sonner';

export interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'list';
  content: any;
}

interface EmailBlockEditorProps {
  initialHtml?: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

export const EmailBlockEditor = ({ initialHtml, onSave, onCancel }: EmailBlockEditorProps) => {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleAddBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}`,
      type,
      content: getDefaultContent(type),
    };
    setBlocks([...blocks, newBlock]);
    toast.success(`${type} block προστέθηκε`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(oldIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);
    
    setBlocks(newBlocks);
  };

  const handleUpdateBlock = (blockId: string, content: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, content } : b));
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
    toast.success('Block διαγράφηκε');
  };

  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find(b => b.id === blockId);
    if (!blockToDuplicate) return;

    const newBlock: EmailBlock = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
    };

    const index = blocks.findIndex(b => b.id === blockId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    toast.success('Block αντιγράφηκε');
  };

  const generateHtml = (): string => {
    const emailStyles = `
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .email-container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
        .email-content { background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      </style>
    `;

    const blocksHtml = blocks.map(block => blockToHtml(block)).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${emailStyles}
</head>
<body>
  <div class="email-container">
    <div class="email-content">
      ${blocksHtml}
    </div>
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
      Αυτό είναι ένα αυτοματοποιημένο email. Παρακαλούμε μην απαντήσετε.
    </p>
  </div>
</body>
</html>
    `.trim();
  };

  const handleSave = () => {
    const html = generateHtml();
    onSave(html);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Block Palette */}
      <div className="lg:col-span-2">
        <EmailBlockPalette onAddBlock={handleAddBlock} />
      </div>

      {/* Canvas */}
      <div className="lg:col-span-7">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Email Editor</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCode(!showCode)}
                >
                  <Code className="h-4 w-4 mr-2" />
                  {showCode ? 'Hide' : 'Show'} Code
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showCode ? (
              <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[600px]">
                <pre className="text-xs font-mono">{generateHtml()}</pre>
              </div>
            ) : showPreview ? (
              <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[600px]">
                <div dangerouslySetInnerHTML={{ __html: generateHtml() }} />
              </div>
            ) : (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <EmailCanvas
                    blocks={blocks}
                    selectedBlockId={selectedBlock?.id}
                    onSelectBlock={(block) => setSelectedBlock(block)}
                    onDeleteBlock={handleDeleteBlock}
                    onDuplicateBlock={handleDuplicateBlock}
                  />
                </SortableContext>
              </DndContext>
            )}

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave}>Save Template</Button>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Panel */}
      <div className="lg:col-span-3">
        {selectedBlock && (
          <EmailBlockPropertiesPanel
            block={selectedBlock}
            onUpdate={(content) => handleUpdateBlock(selectedBlock.id, content)}
          />
        )}
      </div>
    </div>
  );
};

function getDefaultContent(type: EmailBlock['type']): any {
  switch (type) {
    case 'header':
      return { text: 'Email Header', color: '#d32f2f', fontSize: '24px' };
    case 'text':
      return { text: 'Add your text here...', color: '#333', fontSize: '16px' };
    case 'button':
      return { text: 'Click Here', url: '#', bgColor: '#2196F3', textColor: '#ffffff' };
    case 'image':
      return { url: '', alt: 'Image', width: '100%' };
    case 'divider':
      return { color: '#e0e0e0', height: '1px' };
    case 'spacer':
      return { height: '20px' };
    case 'list':
      return { items: ['Item 1', 'Item 2', 'Item 3'], color: '#333' };
    default:
      return {};
  }
}

function blockToHtml(block: EmailBlock): string {
  switch (block.type) {
    case 'header':
      return `<h2 style="color: ${block.content.color}; font-size: ${block.content.fontSize}; margin-top: 0;">${block.content.text}</h2>`;
    
    case 'text':
      return `<p style="color: ${block.content.color}; font-size: ${block.content.fontSize}; line-height: 1.6;">${block.content.text}</p>`;
    
    case 'button':
      return `<div style="text-align: center; margin: 20px 0;"><a href="${block.content.url}" style="display: inline-block; padding: 12px 30px; background-color: ${block.content.bgColor}; color: ${block.content.textColor}; text-decoration: none; border-radius: 4px; font-weight: bold;">${block.content.text}</a></div>`;
    
    case 'image':
      return `<div style="text-align: center; margin: 20px 0;"><img src="${block.content.url}" alt="${block.content.alt}" style="max-width: ${block.content.width}; height: auto; border-radius: 4px;" /></div>`;
    
    case 'divider':
      return `<hr style="border: none; border-top: ${block.content.height} solid ${block.content.color}; margin: 20px 0;" />`;
    
    case 'spacer':
      return `<div style="height: ${block.content.height};"></div>`;
    
    case 'list':
      return `<ul style="color: ${block.content.color}; padding-left: 20px;">${block.content.items.map((item: string) => `<li style="margin: 8px 0;">${item}</li>`).join('')}</ul>`;
    
    default:
      return '';
  }
}
