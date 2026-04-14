import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarCustomer } from '@/components/app-sidebar-customer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Apple, Trash2, Printer, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function SavedPrograms() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['saved-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_programs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-programs'] });
      toast.success(language === 'el' ? 'Το πρόγραμμα διαγράφηκε' : 'Program deleted');
    },
  });

  const printProgram = (content: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        return '<tr>' + cells.map(c => `<td style="border:1px solid #ddd;padding:8px">${c.trim()}</td>`).join('') + '</tr>';
      })
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n{2,}/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Star Gym</title>
      <style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.6}
      h2,h3{color:#7c3aed}table{border-collapse:collapse;width:100%;margin:12px 0}
      td{border:1px solid #ddd;padding:8px}tr:first-child{background:#7c3aed;color:white;font-weight:bold}
      .header{text-align:center;border-bottom:2px solid #7c3aed;padding-bottom:16px;margin-bottom:24px}
      </style></head><body><div class="header"><h1>⭐ Star Gym</h1></div>${html}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarCustomer />
        <main className="flex-1 flex flex-col">
          <div className="border-b">
            <div className="flex h-16 items-center px-6">
              <SidebarTrigger />
              <div className="ml-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">
                  {language === 'el' ? 'Αποθηκευμένα Προγράμματα' : 'Saved Programs'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-12">
                {language === 'el' ? 'Φόρτωση...' : 'Loading...'}
              </p>
            ) : programs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {language === 'el' ? 'Δεν έχεις αποθηκευμένα προγράμματα ακόμα.' : 'No saved programs yet.'}
                </p>
                <Button onClick={() => navigate('/customer/ai-coach')}>
                  {language === 'el' ? 'Πήγαινε στον AI Coach' : 'Go to AI Coach'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {programs.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {p.program_type === 'nutrition' ? (
                          <Apple className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-primary shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{p.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => printProgram(p.content)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                          {expandedId === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {expandedId === p.id && (
                      <div className="mt-4 pt-4 border-t prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{p.content}</ReactMarkdown>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
