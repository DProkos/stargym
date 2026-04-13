import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Loader2, Video } from 'lucide-react';

interface VideoUploadProps {
  currentVideoUrl?: string;
  onVideoUploaded: (url: string) => void;
  folder?: string;
  bucket?: string;
  maxSizeMB?: number;
}

export default function VideoUpload({ 
  currentVideoUrl, 
  onVideoUploaded, 
  folder = 'videos', 
  bucket = 'cms-images',
  maxSizeMB = 50
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentVideoUrl || null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(currentVideoUrl || null);
  }, [currentVideoUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Μη έγκυρος τύπος αρχείου',
        description: 'Ανεβάστε βίντεο σε μορφή MP4, WebM ή MOV',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'Πολύ μεγάλο αρχείο',
        description: `Το βίντεο πρέπει να είναι μικρότερο από ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onVideoUploaded(publicUrl);

      toast({
        title: 'Επιτυχία',
        description: 'Το βίντεο ανέβηκε επιτυχώς',
      });
    } catch (error: any) {
      toast({
        title: 'Αποτυχία ανεβάσματος',
        description: error.message,
        variant: 'destructive',
      });
      setPreview(currentVideoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onVideoUploaded('');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Video className="h-4 w-4" />
        Video
      </Label>
      
      {preview ? (
        <div className="relative inline-block w-full max-w-md">
          <video
            src={preview}
            className="w-full h-48 object-cover rounded-lg border border-border"
            muted
            loop
            playsInline
            autoPlay
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm"
            onChange={handleFileChange}
            disabled={uploading}
            className="max-w-md"
          />
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        MP4, WebM ή MOV (max {maxSizeMB}MB).
      </p>
      <p className="text-xs text-amber-500 font-medium">
        ⚠️ Προτείνεται MP4 — τα αρχεία .mov δεν παίζουν σε Chrome/Firefox, μόνο σε Safari.
      </p>
    </div>
  );
}
