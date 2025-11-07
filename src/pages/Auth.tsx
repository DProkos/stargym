import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { executeRecaptcha, verifyRecaptcha } = useRecaptcha();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get user roles and redirect accordingly (check for highest privilege first)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        
        if (roles && roles.length > 0) {
          const roleList = roles.map(r => r.role);
          
          // Check for admin first (highest privilege)
          if (roleList.includes('admin')) {
            navigate('/admin');
          } else if (roleList.includes('trainer')) {
            navigate('/trainer/schedule');
          } else if (roleList.includes('member')) {
            navigate('/customer/bookings');
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Execute reCAPTCHA
      const action = isLogin ? 'login' : 'signup';
      const recaptchaToken = await executeRecaptcha(action);
      
      if (recaptchaToken) {
        const isValid = await verifyRecaptcha(recaptchaToken);
        if (!isValid) {
          toast({
            title: 'Verification Failed',
            description: 'Please try again',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Get user roles and redirect accordingly
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id);
          
          toast({ title: t('auth.welcomeBack') });
          
          if (roles && roles.length > 0) {
            const roleList = roles.map(r => r.role);
            
            // Check for admin first (highest privilege)
            if (roleList.includes('admin')) {
              navigate('/admin');
            } else if (roleList.includes('trainer')) {
              navigate('/trainer/schedule');
            } else if (roleList.includes('member')) {
              navigate('/customer/bookings');
            }
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        if (data.user) {
          // Generate verification code
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          // Store verification code
          await supabase.from('email_verification_codes').insert({
            user_id: data.user.id,
            code,
            email,
            expires_at: expiresAt.toISOString(),
          });

          // Send verification email
          await supabase.functions.invoke('send-email', {
            body: {
              to: email,
              subject: 'Email Verification Code',
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #6366f1;">Verify Your Email</h1>
                  <p>Welcome ${fullName}! Your verification code is:</p>
                  <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                    ${code}
                  </div>
                  <p>This code will expire in 24 hours.</p>
                  <p>If you didn't create this account, please ignore this email.</p>
                </div>
              `,
              text: `Welcome ${fullName}! Your verification code is: ${code}. This code will expire in 24 hours.`,
            },
          });

          toast({ title: 'Check your email for verification code' });
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-hero">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </CardTitle>
          <CardDescription>
            {isLogin ? t('auth.signIn') : t('auth.signUp')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="bg-secondary border-border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isLogin ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}