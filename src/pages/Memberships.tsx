import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useConfetti } from '@/hooks/useConfetti';

interface MembershipTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  duration_months: number;
  stripe_price_id: string | null;
  display_order: number;
}

export default function Memberships() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { fireCelebration } = useConfetti();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadTiers();
    checkCurrentSubscription();
    checkUser();
  }, []);

  const checkUser = async () => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  };

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      toast.error('Failed to load membership plans');
      return;
    }

    setTiers((data || []).map(tier => ({
      ...tier,
      features: Array.isArray(tier.features) ? tier.features.map(f => String(f)) : []
    })));
    setLoading(false);
  };

  const checkCurrentSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('user_subscriptions')
      .select('tier_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (data) {
      setCurrentSubscription(data.tier_id);
    }
  };

  const handleSubscribe = async (tier: MembershipTier) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t('auth.signIn'));
      navigate('/auth');
      return;
    }

    // TODO: Integrate with Stripe Checkout
    // Fire celebration confetti for demo
    fireCelebration();
    toast.info(t('memberships.comingSoon'));
    
    // Placeholder for Stripe integration
    // When real subscription succeeds, call fireCelebration() here
    // const response = await fetch('/api/create-checkout-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     priceId: tier.stripe_price_id,
    //     userId: session.user.id,
    //   }),
    // });
    // const { url } = await response.json();
    // window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation user={user} isAdmin={isAdmin} />
      <ChatbotWidget />
      
      <main className="flex-grow">
        <section className="pt-32 pb-16">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">{t('memberships.title')}</h1>
              <p className="text-xl text-muted-foreground">
                {t('memberships.subtitle')}
              </p>
            </div>

            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {tiers.map((tier) => (
                  <Card 
                    key={tier.id}
                    className={currentSubscription === tier.id ? 'border-primary' : ''}
                  >
                    <CardHeader>
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-4xl font-bold">
                        ${tier.price}
                        <span className="text-lg font-normal text-muted-foreground">{t('memberships.perMonth')}</span>
                      </div>
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full"
                        onClick={() => handleSubscribe(tier)}
                        disabled={currentSubscription === tier.id}
                      >
                        {currentSubscription === tier.id ? t('memberships.currentPlan') : t('memberships.subscribe')}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
