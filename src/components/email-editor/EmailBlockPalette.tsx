import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Type, Square, MousePointer, Image, Minus, Space, List } from 'lucide-react';

interface EmailBlockPaletteProps {
  onAddBlock: (type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'list') => void;
}

export const EmailBlockPalette = ({ onAddBlock }: EmailBlockPaletteProps) => {
  const blocks = [
    { type: 'header' as const, icon: Type, label: 'Header', description: 'Τίτλος' },
    { type: 'text' as const, icon: Type, label: 'Text', description: 'Κείμενο' },
    { type: 'button' as const, icon: MousePointer, label: 'Button', description: 'Κουμπί' },
    { type: 'image' as const, icon: Image, label: 'Image', description: 'Εικόνα' },
    { type: 'list' as const, icon: List, label: 'List', description: 'Λίστα' },
    { type: 'divider' as const, icon: Minus, label: 'Divider', description: 'Διαχωριστικό' },
    { type: 'spacer' as const, icon: Space, label: 'Spacer', description: 'Κενό' },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Blocks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {blocks.map((block) => (
          <Button
            key={block.type}
            variant="outline"
            className="w-full justify-start text-left h-auto py-3"
            onClick={() => onAddBlock(block.type)}
          >
            <div className="flex items-start gap-2 w-full">
              <block.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{block.label}</div>
                <div className="text-xs text-muted-foreground">{block.description}</div>
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
