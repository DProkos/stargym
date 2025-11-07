import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    // Calculate score
    if (checks.length) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    let label = '';
    let color = '';

    if (score <= 40) {
      label = 'Ασθενής';
      color = 'bg-destructive';
    } else if (score <= 60) {
      label = 'Μέτριος';
      color = 'bg-warning';
    } else if (score <= 80) {
      label = 'Καλός';
      color = 'bg-primary';
    } else {
      label = 'Δυνατός';
      color = 'bg-success';
    }

    return { score, label, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Ισχύς κωδικού:</span>
        <span className={`text-sm font-medium ${
          strength.score <= 40 ? 'text-destructive' :
          strength.score <= 60 ? 'text-warning' :
          strength.score <= 80 ? 'text-primary' : 'text-success'
        }`}>
          {strength.label}
        </span>
      </div>
      <Progress value={strength.score} className="h-2" />
      
      <div className="space-y-1 mt-3">
        <RequirementItem 
          met={strength.checks?.length || false} 
          text="Τουλάχιστον 8 χαρακτήρες" 
        />
        <RequirementItem 
          met={strength.checks?.lowercase || false} 
          text="Πεζά γράμματα (a-z)" 
        />
        <RequirementItem 
          met={strength.checks?.uppercase || false} 
          text="Κεφαλαία γράμματα (A-Z)" 
        />
        <RequirementItem 
          met={strength.checks?.number || false} 
          text="Αριθμοί (0-9)" 
        />
        <RequirementItem 
          met={strength.checks?.special || false} 
          text="Ειδικοί χαρακτήρες (!@#$...)" 
        />
      </div>
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem = ({ met, text }: RequirementItemProps) => (
  <div className="flex items-center gap-2 text-xs">
    {met ? (
      <Check className="h-3 w-3 text-success" />
    ) : (
      <X className="h-3 w-3 text-muted-foreground" />
    )}
    <span className={met ? 'text-success' : 'text-muted-foreground'}>
      {text}
    </span>
  </div>
);
