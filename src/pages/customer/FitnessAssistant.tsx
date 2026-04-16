import { useState, useRef, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarCustomer } from '@/components/app-sidebar-customer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Dumbbell, Apple, Loader2, Download, Save, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { generateProgramPDF } from '@/utils/programPDFGenerator';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitness-assistant`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
    onError(err.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError('No response body'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: rDone, value } = await reader.read();
    if (rDone) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

function printMessage(content: string, language: 'el' | 'en') {
  const win = window.open('', '_blank');
  if (!win) { toast.error('Popup blocked'); return; }

  // Convert markdown to basic HTML
  const html = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td style="border:1px solid #ddd;padding:8px">${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  const wrappedHtml = html
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, (m, _, offset, str) => {
      const before = str.substring(0, offset);
      if (before.includes('<table') && !before.includes('</table>')) return m;
      return '<table style="border-collapse:collapse;width:100%;margin:12px 0">' + m;
    })
    .replace(/<\/tr>(?![\s\S]*?<tr>)/g, '</tr></table>');

  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>${language === 'el' ? 'Star Gym - Πρόγραμμα' : 'Star Gym - Plan'}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.6; }
      h1, h2, h3 { color: #7c3aed; margin-top: 24px; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
      tr:nth-child(1) { background: #7c3aed; color: white; font-weight: bold; }
      li { margin: 4px 0; }
      .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
      .header h1 { margin: 0; font-size: 28px; }
      .header p { color: #666; margin: 4px 0 0; }
      .footer { text-align: center; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 32px; color: #999; font-size: 12px; }
      @media print { body { padding: 20px; } }
    </style>
  </head><body>
    <div class="header">
      <h1>⭐ Star Gym</h1>
      <p>${language === 'el' ? 'Εξατομικευμένο Πρόγραμμα - AI Coach' : 'Personalized Plan - AI Coach'}</p>
      <p style="font-size:12px;color:#999">${new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')}</p>
    </div>
    ${wrappedHtml}
    <div class="footer">
      <p>Star Gym Μενίδι • ${language === 'el' ? 'Δημιουργήθηκε από AI Coach' : 'Generated by AI Coach'}</p>
    </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

const quickPrompts = [
  { icon: Dumbbell, label: { el: 'Πρόγραμμα Γυμναστικής', en: 'Workout Plan' }, prompt: { el: 'Θέλω ένα πρόγραμμα γυμναστικής. Ρώτα με για τους στόχους μου.', en: 'I want a workout plan. Ask me about my goals.' } },
  { icon: Apple, label: { el: 'Πλάνο Διατροφής', en: 'Nutrition Plan' }, prompt: { el: 'Θέλω ένα πλάνο διατροφής. Ρώτα με για τους στόχους μου.', en: 'I want a nutrition plan. Ask me about my goals.' } },
];

export default function FitnessAssistant() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SAVE_LIMIT = 10;

  const saveProgram = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error(language === 'el' ? 'Πρέπει να είσαι συνδεδεμένος' : 'Must be logged in'); return; }

    // Check current count against limit
    const { count, error: countError } = await supabase
      .from('saved_programs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) {
      toast.error(language === 'el' ? 'Σφάλμα ελέγχου ορίου' : 'Limit check error');
      return;
    }
    if ((count ?? 0) >= SAVE_LIMIT) {
      toast.error(
        language === 'el'
          ? `Έφτασες το όριο των ${SAVE_LIMIT} αποθηκευμένων προγραμμάτων. Διέγραψε κάποιο παλιό για να σώσεις νέο.`
          : `You reached the limit of ${SAVE_LIMIT} saved programs. Delete an old one to save a new program.`,
        { duration: 6000 }
      );
      return;
    }

    const isNutrition = /διατροφ|nutrition|θερμίδ|calori|γεύμα|meal/i.test(content);
    const type = isNutrition ? 'nutrition' : 'workout';
    const title = content.match(/^#+\s*(.+)$/m)?.[1]
      || (type === 'nutrition'
        ? (language === 'el' ? 'Πλάνο Διατροφής' : 'Nutrition Plan')
        : (language === 'el' ? 'Πρόγραμμα Γυμναστικής' : 'Workout Plan'))
      + ' - ' + new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');

    const { error } = await supabase.from('saved_programs').insert({
      user_id: user.id, title, content, program_type: type,
    });
    if (error) { toast.error(language === 'el' ? 'Σφάλμα αποθήκευσης' : 'Save error'); return; }
    toast.success(language === 'el' ? 'Αποθηκεύτηκε!' : 'Saved!');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (msg) => {
          toast.error(msg);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error(language === 'el' ? 'Σφάλμα σύνδεσης' : 'Connection error');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarCustomer />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="h-14 sm:h-16 border-b sticky top-0 bg-background z-30 flex items-center px-3 sm:px-6 gap-2">
            <SidebarTrigger />
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-base sm:text-2xl font-bold truncate flex-1">
              {language === 'el' ? 'AI Προπονητής' : 'AI Coach'}
            </h1>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate('/customer/saved-programs')}>
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'el' ? 'Αποθηκευμένα' : 'Saved'}</span>
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div className="bg-primary/10 rounded-full p-6">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                    {language === 'el' ? 'Γεια σου! Είμαι ο AI Coach σου 💪' : 'Hey! I\'m your AI Coach 💪'}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                    {language === 'el'
                      ? 'Μπορώ να σου φτιάξω εξατομικευμένο πρόγραμμα γυμναστικής και διατροφής. Ξεκίνα με μια ερώτηση ή επέλεξε παρακάτω!'
                      : 'I can create personalized workout and nutrition plans for you. Start with a question or pick below!'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {quickPrompts.map((qp, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="gap-2"
                      onClick={() => send(qp.prompt[language])}
                    >
                      <qp.icon className="h-4 w-4" />
                      {qp.label[language]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <Card className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 overflow-hidden ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="min-w-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-table:block prose-table:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words prose-img:max-w-full prose-headings:break-words">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {!isLoading && msg.content.length > 100 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => printMessage(msg.content, language)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            {language === 'el' ? 'Εκτύπωση' : 'Print'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => saveProgram(msg.content)}
                          >
                            <Save className="h-3.5 w-3.5" />
                            {language === 'el' ? 'Αποθήκευση' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </Card>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="p-4 bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </Card>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3 sm:p-4 sticky bottom-0 bg-background">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === 'el' ? 'Γράψε το μήνυμά σου...' : 'Type your message...'}
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button onClick={() => send(input)} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
