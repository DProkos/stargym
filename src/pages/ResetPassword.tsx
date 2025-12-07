import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, CheckCircle, XCircle } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('reset-password-with-token', {
          body: { token, action: 'validate' }
        });

        if (error || !data?.valid) {
          setIsValid(false);
        } else {
          setIsValid(true);
          setExpiresAt(data.expires_at);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Οι κωδικοί δεν ταιριάζουν");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-password-with-token', {
        body: { token, newPassword }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setIsSuccess(true);
        toast.success("Ο κωδικός άλλαξε επιτυχώς!");
      } else {
        throw new Error(data?.error || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      toast.error(err.message || "Αποτυχία αλλαγής κωδικού");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRemainingTime = () => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    if (diffMs <= 0) return "Έληξε";
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Επικύρωση συνδέσμου...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Μη έγκυρος σύνδεσμος</CardTitle>
            <CardDescription>
              Ο σύνδεσμος επαναφοράς κωδικού δεν είναι έγκυρος ή έχει λήξει.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Επιστροφή στη Σύνδεση
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Επιτυχής αλλαγή κωδικού!</CardTitle>
            <CardDescription>
              Ο κωδικός σας άλλαξε επιτυχώς. Μπορείτε τώρα να συνδεθείτε.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Σύνδεση
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Ορισμός Νέου Κωδικού</CardTitle>
          <CardDescription>
            Εισάγετε τον νέο σας κωδικό πρόσβασης
          </CardDescription>
          {expiresAt && (
            <p className="text-sm text-amber-600 mt-2">
              Ο σύνδεσμος λήγει σε: {getRemainingTime()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Νέος Κωδικός</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Εισάγετε νέο κωδικό"
                required
                minLength={6}
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Επιβεβαίωση Κωδικού</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Επιβεβαιώστε τον κωδικό"
                required
                minLength={6}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Οι κωδικοί δεν ταιριάζουν</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                "Αποθήκευση Κωδικού"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
