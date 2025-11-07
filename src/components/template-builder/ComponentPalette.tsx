import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Type, Image, Square, Link2, Columns, AlignLeft } from 'lucide-react';

interface ComponentType {
  id: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  defaultProps: any;
}

const components: ComponentType[] = [
  {
    id: 'heading',
    type: 'heading',
    label: 'Heading',
    icon: <Type className="h-5 w-5" />,
    defaultProps: {
      text: 'Your Heading Here',
      level: 1,
      align: 'center',
      color: '#333333',
    },
  },
  {
    id: 'text',
    type: 'text',
    label: 'Text Block',
    icon: <AlignLeft className="h-5 w-5" />,
    defaultProps: {
      text: 'Add your text content here. You can customize the style and alignment.',
      align: 'left',
      color: '#666666',
      fontSize: 16,
    },
  },
  {
    id: 'image',
    type: 'image',
    label: 'Image',
    icon: <Image className="h-5 w-5" />,
    defaultProps: {
      src: 'https://via.placeholder.com/600x300',
      alt: 'Image description',
      width: '100%',
    },
  },
  {
    id: 'button',
    type: 'button',
    label: 'Button',
    icon: <Square className="h-5 w-5" />,
    defaultProps: {
      text: 'Click Here',
      url: '#',
      align: 'center',
      backgroundColor: '#667eea',
      textColor: '#ffffff',
      borderRadius: 30,
    },
  },
  {
    id: 'divider',
    type: 'divider',
    label: 'Divider',
    icon: <Link2 className="h-5 w-5" />,
    defaultProps: {
      color: '#e0e0e0',
      height: 1,
      margin: 20,
    },
  },
  {
    id: 'columns',
    type: 'columns',
    label: '2 Columns',
    icon: <Columns className="h-5 w-5" />,
    defaultProps: {
      columns: 2,
      gap: 20,
    },
  },
];

interface ComponentPaletteProps {
  onAddComponent: (componentType: ComponentType) => void;
}

export function ComponentPalette({ onAddComponent }: ComponentPaletteProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Components</CardTitle>
        <CardDescription>Drag components to build your template</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {components.map((component) => (
            <button
              key={component.id}
              onClick={() => onAddComponent(component)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted hover:border-primary transition-colors cursor-pointer"
            >
              {component.icon}
              <span className="text-sm font-medium">{component.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
