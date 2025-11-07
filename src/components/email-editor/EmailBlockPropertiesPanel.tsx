import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmailBlock } from './EmailBlockEditor';

interface EmailBlockPropertiesPanelProps {
  block: EmailBlock;
  onUpdate: (content: any) => void;
}

export const EmailBlockPropertiesPanel = ({ block, onUpdate }: EmailBlockPropertiesPanelProps) => {
  const handleChange = (field: string, value: any) => {
    onUpdate({
      ...block.content,
      [field]: value,
    });
  };

  const handleListItemChange = (index: number, value: string) => {
    const newItems = [...block.content.items];
    newItems[index] = value;
    onUpdate({
      ...block.content,
      items: newItems,
    });
  };

  const addListItem = () => {
    onUpdate({
      ...block.content,
      items: [...block.content.items, 'New item'],
    });
  };

  const removeListItem = (index: number) => {
    const newItems = block.content.items.filter((_: any, i: number) => i !== index);
    onUpdate({
      ...block.content,
      items: newItems,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {block.type === 'header' && (
          <>
            <div className="space-y-2">
              <Label>Text</Label>
              <Input
                value={block.content.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={block.content.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Input
                value={block.content.fontSize}
                onChange={(e) => handleChange('fontSize', e.target.value)}
                placeholder="24px"
              />
            </div>
          </>
        )}

        {block.type === 'text' && (
          <>
            <div className="space-y-2">
              <Label>Text</Label>
              <Textarea
                value={block.content.text}
                onChange={(e) => handleChange('text', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={block.content.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Input
                value={block.content.fontSize}
                onChange={(e) => handleChange('fontSize', e.target.value)}
                placeholder="16px"
              />
            </div>
          </>
        )}

        {block.type === 'button' && (
          <>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={block.content.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={block.content.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={block.content.bgColor}
                onChange={(e) => handleChange('bgColor', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <Input
                type="color"
                value={block.content.textColor}
                onChange={(e) => handleChange('textColor', e.target.value)}
              />
            </div>
          </>
        )}

        {block.type === 'image' && (
          <>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={block.content.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={block.content.alt}
                onChange={(e) => handleChange('alt', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Input
                value={block.content.width}
                onChange={(e) => handleChange('width', e.target.value)}
                placeholder="100%"
              />
            </div>
          </>
        )}

        {block.type === 'divider' && (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={block.content.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Input
                value={block.content.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="1px"
              />
            </div>
          </>
        )}

        {block.type === 'spacer' && (
          <div className="space-y-2">
            <Label>Height</Label>
            <Input
              value={block.content.height}
              onChange={(e) => handleChange('height', e.target.value)}
              placeholder="20px"
            />
          </div>
        )}

        {block.type === 'list' && (
          <>
            <div className="space-y-2">
              <Label>List Items</Label>
              {block.content.items.map((item: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => handleListItemChange(index, e.target.value)}
                  />
                  <button
                    onClick={() => removeListItem(index)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addListItem}
                className="text-sm text-primary hover:underline"
              >
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={block.content.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
