import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const plans = [
    {
      name: t('pricing.monthly'),
      price: '€79',
      period: t('pricing.perMonth'),
      features: [
        'Unlimited gym access',
        'All group classes',
        'Locker room access',
        'Free Wi-Fi',
      ],
    },
    {
      name: t('pricing.annual'),
      price: '€699',
      period: '/year',
      features: [
        'Unlimited gym access',
        'All group classes',
        'Locker room access',
        'Free Wi-Fi',
        'Personal trainer session (1/month)',
        'Nutrition consultation',
        'Priority booking',
      ],
      popular: true,
    },
    {
      name: 'Premium',
      price: '€149',
      period: t('pricing.perMonth'),
      features: [
        'Everything in Annual',
        'Personal trainer sessions (4/month)',
        'Massage therapy (2/month)',
        'Private locker',
        'Guest passes (5/month)',
        'Supplement discount',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} isAdmin={isAdmin} />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('pricing.title')}
            </h1>
            <p className="text-xl text-muted-foreground">{t('pricing.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`bg-gradient-card border-border transition-all duration-300 ${
                  plan.popular 
                    ? 'border-primary shadow-neon-strong scale-105' 
                    : 'hover:border-primary hover:shadow-neon'
                }`}
              >
                <CardHeader>
                  {plan.popular && (
                    <div className="text-primary text-sm font-semibold mb-2">Most Popular</div>
                  )}
                  <CardTitle className="text-3xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'secondary'}
                    asChild
                  >
                    <Link to="/auth">{t('pricing.selectPlan')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}