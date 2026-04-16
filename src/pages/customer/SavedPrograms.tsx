import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarCustomer } from '@/components/app-sidebar-customer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Apple, Trash2, Printer, ChevronDown, ChevronUp, BookOpen, Pencil, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function SavedPrograms() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

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

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from('saved_programs')
        .update({ title })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-programs'] });
      setEditingId(null);
      setEditingTitle('');
      toast.success(language === 'el' ? 'Ο τίτλος ενημερώθηκε' : 'Title updated');
    },
    onError: () => {
      toast.error(language === 'el' ? 'Σφάλμα ενημέρωσης' : 'Update error');
    },
  });

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      toast.error(language === 'el' ? 'Ο τίτλος δεν μπορεί να είναι κενός' : 'Title cannot be empty');
      return;
    }
    renameMutation.mutate({ id, title: trimmed });
  };

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
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="h-14 sm:h-16 border-b sticky top-0 bg-background z-30 flex items-center px-3 sm:px-6 gap-2">
            <SidebarTrigger />
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-base sm:text-2xl font-bold truncate flex-1">
              {language === 'el' ? 'Αποθηκευμένα Προγράμματα' : 'Saved Programs'}
            </h1>
            {!isLoading && (
              <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-md shrink-0 ${programs.length >= 10 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                {programs.length}/10
              </span>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
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
              <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full min-w-0">
                {programs.map((p) => (
                  <Card key={p.id} className="p-3 sm:p-4 overflow-hidden w-full min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {p.program_type === 'nutrition' ? (
                          <Apple className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-primary shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          {editingId === p.id ? (
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(p.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              autoFocus
                              maxLength={120}
                              className="h-8 text-sm sm:text-base"
                            />
                          ) : (
                            <h3 className="font-semibold truncate text-sm sm:text-base">{p.title}</h3>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {editingId === p.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => saveEdit(p.id)} disabled={renameMutation.isPending}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => startEdit(p.id, p.title)} title={language === 'el' ? 'Μετονομασία' : 'Rename'}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => printProgram(p.content)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => deleteMutation.mutate(p.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                              {expandedId === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {expandedId === p.id && (
                      <div className="mt-4 pt-4 border-t w-full min-w-0 max-w-full overflow-hidden">
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] prose-headings:break-words prose-p:break-words prose-li:break-words prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-x-auto prose-pre:max-w-full prose-img:max-w-full prose-img:h-auto prose-a:break-all"
                        >
                          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 prose-table:min-w-0">
                            <ReactMarkdown
                              components={{
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto">
                                    <table {...props} className="min-w-full" />
                                  </div>
                                ),
                                pre: ({ node, ...props }) => (
                                  <pre {...props} className="overflow-x-auto whitespace-pre-wrap break-words" />
                                ),
                              }}
                            >
                              {p.content}
                            </ReactMarkdown>
                          </div>
                        </div>
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
