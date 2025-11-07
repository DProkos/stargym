import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Mail, Shield } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const verificationCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
});

export function PasswordChangeWithVerification() {
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'verify' | 'change'>('request');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleRequestCode = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('send-password-change-code', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Verification code sent',
        description: 'Please check your email for the verification code',
      });

      setStep('verify');
    } catch (error: any) {
      toast({
        title: 'Error sending code',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Validate code format
      const validation = verificationCodeSchema.safeParse({ code: verificationCode });
      if (!validation.success) {
        const fieldErrors: { [key: string]: string } = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check if code is valid and not expired
      const { data: codeData, error: codeError } = await supabase
        .from('password_change_codes')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('code', verificationCode)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (codeError || !codeData) {
        throw new Error('Invalid or expired verification code');
      }

      // Mark code as verified
      await supabase
        .from('password_change_codes')
        .update({ verified: true })
        .eq('id', codeData.id);

      toast({
        title: 'Code verified',
        description: 'You can now change your password',
      });

      setStep('change');
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Validate password
      const validation = passwordSchema.safeParse(passwordData);
      if (!validation.success) {
        const fieldErrors: { [key: string]: string } = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
      });

      // Reset form
      setStep('request');
      setVerificationCode('');
      setPasswordData({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error changing password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          {step === 'request' && 'Request a verification code to change your password'}
          {step === 'verify' && 'Enter the verification code sent to your email'}
          {step === 'change' && 'Enter your new password'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'request' && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Enhanced Security
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    For your protection, we'll send a verification code to your email before allowing password changes.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleRequestCode} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" /> Send Verification Code</>
              )}
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, ''));
                  setErrors({});
                }}
                placeholder="Enter 6-digit code"
                className={errors.code ? 'border-destructive' : ''}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Check your email for the verification code. It expires in 10 minutes.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('request');
                  setVerificationCode('');
                  setErrors({});
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'change' && (
          <>
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Code verified! You can now change your password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, newPassword: e.target.value });
                  setErrors({});
                }}
                placeholder="Enter new password"
                className={errors.newPassword ? 'border-destructive' : ''}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                  setErrors({});
                }}
                placeholder="Confirm new password"
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('request');
                  setVerificationCode('');
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                  setErrors({});
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={loading || !passwordData.newPassword}
                className="flex-1"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Changing...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" /> Change Password</>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}