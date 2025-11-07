import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal';
  align?: 'start' | 'end';
}

export function LanguageSwitcher({ variant = 'default', align = 'end' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Languages className="h-4 w-4" />
            <span className="font-medium">{language === 'en' ? 'EN' : 'ΕΛ'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuItem onClick={() => setLanguage('en')} className="gap-2">
            🇬🇧 English
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguage('el')} className="gap-2">
            🇬🇷 Ελληνικά
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="text-lg">{language === 'en' ? '🇬🇧' : '🇬🇷'}</span>
          <span className="font-medium">{language === 'en' ? 'English' : 'Ελληνικά'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem onClick={() => setLanguage('en')} className="gap-2">
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('el')} className="gap-2">
          🇬🇷 Ελληνικά
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
