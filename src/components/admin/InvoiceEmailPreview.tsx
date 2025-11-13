import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';

interface InvoiceEmailPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailHtml: string;
  pdfUrl: string;
  onSend: () => void;
  isSending: boolean;
}

export default function InvoiceEmailPreview({
  open,
  onOpenChange,
  emailHtml,
  pdfUrl,
  onSend,
  isSending,
}: InvoiceEmailPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Προεπισκόπηση Email Τιμολογίου</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="email" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
          </TabsList>

          <TabsContent 
            value="email" 
            className="flex-1 overflow-auto border rounded-lg p-4 mt-4"
          >
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: emailHtml }}
            />
          </TabsContent>

          <TabsContent 
            value="pdf" 
            className="flex-1 overflow-hidden mt-4"
          >
            <iframe
              src={pdfUrl}
              className="w-full h-[60vh] border rounded-lg"
              title="Invoice PDF Preview"
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Ακύρωση
          </Button>
          <Button
            onClick={onSend}
            disabled={isSending}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Αποστολή...' : 'Αποστολή Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
