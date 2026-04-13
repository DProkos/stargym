import { SEOHead } from '@/components/SEOHead';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Dumbbell, Users, Award, Clock } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/hero-gym.jpg';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { usePageSections } from '@/hooks/usePageSections';
import { DynamicPageSections } from '@/components/DynamicSection';

export default function Home() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { sections, getSetting, loading } = usePageSections('home');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();
        setIsAdmin(!!data);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show skeleton while loading to prevent flash of old content
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead path="/" />
        <Navigation user={user} isAdmin={isAdmin} />
        <main className="flex-grow">
          {/* Hero Skeleton - Mobile Optimized */}
          <section className="pt-20 sm:pt-32 pb-12 sm:pb-20 px-4 relative overflow-hidden bg-background">
            <div className="container mx-auto relative z-10 text-center">
              <div className="h-10 sm:h-16 md:h-24 w-[90%] sm:w-3/4 max-w-xl mx-auto mb-4 sm:mb-6 rounded-lg page-skeleton" />
              <div className="h-4 sm:h-6 md:h-8 w-[80%] sm:w-2/3 max-w-md mx-auto mb-6 sm:mb-8 rounded page-skeleton" />
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <div className="h-10 sm:h-12 w-28 sm:w-40 rounded-lg page-skeleton" />
                <div className="h-10 sm:h-12 w-28 sm:w-40 rounded-lg page-skeleton" />
              </div>
            </div>
          </section>
          {/* Features Skeleton - Mobile Optimized */}
          <section className="py-12 sm:py-20 px-4">
            <div className="container mx-auto">
              <div className="text-center mb-8 sm:mb-16">
                <div className="h-6 sm:h-10 w-2/3 sm:w-1/2 max-w-sm mx-auto mb-3 sm:mb-4 rounded page-skeleton" />
                <div className="h-4 sm:h-6 w-3/4 sm:w-2/3 max-w-md mx-auto rounded page-skeleton" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 sm:p-8 rounded-lg border border-border">
                    <div className="h-8 sm:h-12 w-8 sm:w-12 mb-3 sm:mb-4 rounded page-skeleton" />
                    <div className="h-4 sm:h-6 w-3/4 mb-2 rounded page-skeleton" />
                    <div className="h-3 sm:h-4 w-full rounded page-skeleton" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // If there are dynamic sections, use them
  if (sections.length > 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation user={user} isAdmin={isAdmin} />
        <ChatbotWidget />
        <main className="flex-grow">
          <DynamicPageSections sections={sections} getSetting={getSetting} />
        </main>
        <Footer />
      </div>
    );
  }

  // Fallback to static content if no sections in database
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead path="/" />
      <Navigation user={user} isAdmin={isAdmin} />
      <ChatbotWidget />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 bg-gradient-hero relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src={heroImage} alt="Gym" className="w-full h-full object-cover" />
          </div>
          <div className="container mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="shadow-neon-strong" asChild>
                  <Link to="/auth">{t('hero.cta')}</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/classes">{t('hero.cta2')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">{t('about.title')}</h2>
              <p className="text-xl text-muted-foreground">{t('about.desc')}</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-gradient-card p-8 rounded-lg border border-border hover:border-primary transition-all duration-300 hover:shadow-neon">
                <Dumbbell className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('home.features.equipment.title')}</h3>
                <p className="text-muted-foreground">{t('home.features.equipment.desc')}</p>
              </div>
              
              <div className="bg-gradient-card p-8 rounded-lg border border-border hover:border-primary transition-all duration-300 hover:shadow-neon">
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('home.features.trainers.title')}</h3>
                <p className="text-muted-foreground">{t('home.features.trainers.desc')}</p>
              </div>
              
              <div className="bg-gradient-card p-8 rounded-lg border border-border hover:border-primary transition-all duration-300 hover:shadow-neon">
                <Award className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('home.features.results.title')}</h3>
                <p className="text-muted-foreground">{t('home.features.results.desc')}</p>
              </div>
              
              <div className="bg-gradient-card p-8 rounded-lg border border-border hover:border-primary transition-all duration-300 hover:shadow-neon">
                <Clock className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('home.features.hours.title')}</h3>
                <p className="text-muted-foreground">{t('home.features.hours.desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-hero">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">{t('home.cta.ready')}</h2>
            <p className="text-xl text-muted-foreground mb-8">{t('home.cta.join')}</p>
            <Button size="lg" className="shadow-neon-strong" asChild>
              <Link to="/auth">{t('hero.cta')}</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}