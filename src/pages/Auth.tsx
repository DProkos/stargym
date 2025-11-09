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
import { Navigation } from '@/components/Navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [unverifiedUser, setUnverifiedUser] = useState<{ email: string; userId: string } | null>(null);
  const [resendingCode, setResendingCode] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { executeRecaptcha, verifyRecaptcha } = useRecaptcha();

  useEffect(() => {
    checkSignupEnabled();
    checkUnverifiedUser();
  }, []);

  const checkUnverifiedUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Check if user has unverified email
      const { data: verificationData } = await supabase
        .from('email_verification_codes')
        .select('verified, email')
        .eq('user_id', session.user.id)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verificationData) {
        setUnverifiedUser({
          email: verificationData.email,
          userId: session.user.id
        });
      }
    }
  };

  const checkSignupEnabled = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'signup_enabled')
      .maybeSingle();

    setSignupEnabled(data?.setting_value !== 'false');
  };

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

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    
    setResendingCode(true);
    try {
      // Generate new verification code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Delete old codes
      await supabase
        .from('email_verification_codes')
        .delete()
        .eq('user_id', unverifiedUser.userId)
        .eq('verified', false);

      // Insert new verification code
      await supabase.from('email_verification_codes').insert({
        user_id: unverifiedUser.userId,
        code,
        email: unverifiedUser.email,
        expires_at: expiresAt.toISOString(),
      });

      // Get user's full name from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', unverifiedUser.userId)
        .single();

      // Send verification email
      await supabase.functions.invoke('send-email', {
        body: {
          to: unverifiedUser.email,
          subject: 'Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Verify Your Email</h1>
              <p>Welcome ${profile?.full_name || ''}! Your verification code is:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${code}
              </div>
              <p>This code will expire in 24 hours.</p>
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
          `,
          text: `Welcome ${profile?.full_name || ''}! Your verification code is: ${code}. This code will expire in 24 hours.`,
        },
      });

      toast({ 
        title: 'Verification code sent',
        description: 'Check your email for the new verification code'
      });
      navigate(`/verify-email?email=${encodeURIComponent(unverifiedUser.email)}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResendingCode(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: 'Check your email',
        description: 'Password reset link has been sent to your email address',
      });
      setIsForgotPassword(false);
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
        // Check if signup is enabled (should not reach here, but extra safety)
        if (!signupEnabled) {
          toast({
            title: 'Registration Disabled',
            description: 'New user registration is currently disabled. Please contact support.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
          toast({
            title: 'Passwords do not match',
            description: 'Please make sure your passwords match',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

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

          // Sign out immediately - user must verify email first
          await supabase.auth.signOut();

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
    <>
      <Navigation user={null} isAdmin={false} />
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-hero pt-16">
        <div className="w-full max-w-md space-y-4">
          {unverifiedUser && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Your email is not verified. Please verify to access all features.</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendingCode}
                  className="ml-2"
                >
                  {resendingCode ? '...' : 'Resend Code'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        <Card className="w-full bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isForgotPassword ? 'Reset Password' : isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </CardTitle>
          <CardDescription>
            {isForgotPassword ? 'Enter your email to receive a password reset link' : isLogin ? t('auth.signIn') : t('auth.signUp')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t('auth.email')}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary border-border"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '...' : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
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
              {!isLogin && <PasswordStrengthIndicator password={password} />}
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                  className="bg-secondary border-border"
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isLogin ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </form>
          )}
          {!isForgotPassword && signupEnabled && isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('auth.noAccount')}
              </button>
            </div>
          )}
          {!isForgotPassword && signupEnabled && !isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('auth.haveAccount')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </>
  );
}