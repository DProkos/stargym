import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function VerifyEmail() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify the code without requiring session
      const { data: verificationData, error: verifyError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email || '')
        .eq('code', code.trim())
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !verificationData) {
        toast.error('Invalid or expired verification code');
        setLoading(false);
        return;
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from('email_verification_codes')
        .update({ verified: true })
        .eq('id', verificationData.id);

      if (updateError) throw updateError;

      toast.success('Email verified successfully! You can now log in.');
      navigate('/auth');
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error('Email address is required');
      return;
    }

    try {
      // Find user by email to get user_id
      const { data: verificationData } = await supabase
        .from('email_verification_codes')
        .select('user_id')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!verificationData) {
        toast.error('No verification request found for this email');
        return;
      }

      // Generate new verification code
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('email_verification_codes')
        .insert({
          user_id: verificationData.user_id,
          code: newCode,
          email: email,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      // Send verification email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Verify Your Email</h1>
              <p>Your verification code is:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${newCode}
              </div>
              <p>This code will expire in 24 hours.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
          `,
          text: `Your verification code is: ${newCode}. This code will expire in 24 hours.`,
        },
      });

      if (emailError) throw emailError;

      toast.success('Verification code sent to your email');
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.message || 'Failed to resend code');
    }
  };

  return (
    <>
      <Navigation user={null} isAdmin={false} />
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-hero pt-16">
        <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            {email ? `We sent a verification code to ${email}` : 'Enter the verification code sent to your email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-secondary border-border text-center text-2xl tracking-wider"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResendCode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
