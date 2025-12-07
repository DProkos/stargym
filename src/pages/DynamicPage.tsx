import { useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { DynamicPageSections } from '@/components/DynamicSection';
import { usePageSections } from '@/hooks/usePageSections';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function DynamicPage({ pageKeyOverride }: { pageKeyOverride?: string }) {
  const { pageKey: paramKey } = useParams<{ pageKey: string }>();
  const pageKey = pageKeyOverride || paramKey || '';
  const { sections, loading, getSetting } = usePageSections(pageKey);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        setIsAdmin(!!data);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} isAdmin={isAdmin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Φόρτωση...</div>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} isAdmin={isAdmin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Η σελίδα δεν βρέθηκε</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} isAdmin={isAdmin} />
      <DynamicPageSections sections={sections} getSetting={getSetting} />
      <ChatbotWidget />
    </div>
  );
}
