import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ImageUpload';

interface ComponentData {
  id: string;
  type: string;
  props: any;
}

interface PropertiesPanelProps {
  component: ComponentData | null;
  onUpdate: (id: string, props: any) => void;
}

export function PropertiesPanel({ component, onUpdate }: PropertiesPanelProps) {
  if (!component) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a component to edit its properties
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (key: string, value: any) => {
    onUpdate(component.id, { ...component.props, [key]: value });
  };

  const renderProperties = () => {
    switch (component.type) {
      case 'heading':
        return (
          <>
            <div className="space-y-2">
              <Label>Text</Label>
              <Input
                value={component.props.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={component.props.level.toString()}
                onValueChange={(value) => handleChange('level', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1 (Large)</SelectItem>
                  <SelectItem value="2">H2 (Medium)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select
                value={component.props.align}
                onValueChange={(value) => handleChange('align', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={component.props.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div className="space-y-2">
              <Label>Text</Label>
              <Textarea
                value={component.props.text}
                onChange={(e) => handleChange('text', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Font Size (px)</Label>
              <Input
                type="number"
                value={component.props.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select
                value={component.props.align}
                onValueChange={(value) => handleChange('align', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={component.props.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
          </>
        );

      case 'image':
        return (
          <>
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload
                currentImageUrl={component.props.src}
                onImageUploaded={(url) => handleChange('src', url)}
                folder="templates"
                bucket="template-images"
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={component.props.alt}
                onChange={(e) => handleChange('alt', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Input
                value={component.props.width}
                onChange={(e) => handleChange('width', e.target.value)}
                placeholder="e.g., 100%, 400px"
              />
            </div>
          </>
        );

      case 'button':
        return (
          <>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={component.props.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={component.props.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select
                value={component.props.align}
                onValueChange={(value) => handleChange('align', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={component.props.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <Input
                type="color"
                value={component.props.textColor}
                onChange={(e) => handleChange('textColor', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Border Radius (px)</Label>
              <Input
                type="number"
                value={component.props.borderRadius}
                onChange={(e) => handleChange('borderRadius', parseInt(e.target.value))}
              />
            </div>
          </>
        );

      case 'divider':
        return (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={component.props.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Height (px)</Label>
              <Input
                type="number"
                value={component.props.height}
                onChange={(e) => handleChange('height', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Margin (px)</Label>
              <Input
                type="number"
                value={component.props.margin}
                onChange={(e) => handleChange('margin', parseInt(e.target.value))}
              />
            </div>
          </>
        );

      case 'columns':
        return (
          <>
            <div className="space-y-2">
              <Label>Number of Columns</Label>
              <Select
                value={component.props.columns.toString()}
                onValueChange={(value) => handleChange('columns', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gap (px)</Label>
              <Input
                type="number"
                value={component.props.gap}
                onChange={(e) => handleChange('gap', parseInt(e.target.value))}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="h-full overflow-auto">
      <CardHeader>
        <CardTitle>Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderProperties()}
      </CardContent>
    </Card>
  );
}
