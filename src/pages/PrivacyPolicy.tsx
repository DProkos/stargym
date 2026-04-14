import { useEffect, useState } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteName, setSiteName] = useState('Star Gym');
  const [contactEmail, setContactEmail] = useState('');

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

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['site_name', 'contact_email']);
      if (data) {
        data.forEach((item) => {
          if (item.setting_key === 'site_name') setSiteName(item.setting_value || 'Star Gym');
          if (item.setting_key === 'contact_email') setContactEmail(item.setting_value || '');
        });
      }
    };

    checkUser();
    fetchSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const content = language === 'el' ? {
    title: 'Πολιτική Απορρήτου',
    lastUpdated: 'Τελευταία ενημέρωση',
    sections: [
      {
        title: 'Ποια δεδομένα συλλέγουμε',
        content: `Συλλέγουμε μόνο τα δεδομένα που μας παρέχετε εσείς μέσω της φόρμας επικοινωνίας ή κατά την εγγραφή σας:\n\n• Ονοματεπώνυμο\n• Διεύθυνση email\n• Τηλέφωνο (προαιρετικά)\n• Μήνυμα επικοινωνίας`,
      },
      {
        title: 'Γιατί τα συλλέγουμε',
        content: `Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για:\n\n• Να απαντήσουμε στο μήνυμά σας\n• Να σας ενημερώσουμε για τις υπηρεσίες μας\n• Να διαχειριστούμε τον λογαριασμό σας (εάν εγγραφείτε)\n\nΔεν μοιραζόμαστε τα δεδομένα σας με τρίτους.`,
      },
      {
        title: 'Πόσο καιρό τα κρατάμε',
        content: 'Τα δεδομένα σας διατηρούνται για όσο χρόνο είναι απαραίτητο για τον σκοπό που συλλέχθηκαν. Εάν δεν υπάρχει ενεργή σχέση, τα δεδομένα διαγράφονται εντός 12 μηνών.',
      },
      {
        title: 'Τα δικαιώματά σας',
        content: `Έχετε το δικαίωμα να:\n\n• Ζητήσετε πρόσβαση στα δεδομένα σας\n• Ζητήσετε διόρθωση ή διαγραφή τους\n• Ανακαλέσετε τη συγκατάθεσή σας ανά πάσα στιγμή\n\nΓια οποιοδήποτε αίτημα, επικοινωνήστε μαζί μας στο ${contactEmail || 'email μας'}.`,
      },
      {
        title: 'Ασφάλεια δεδομένων',
        content: 'Λαμβάνουμε κατάλληλα τεχνικά και οργανωτικά μέτρα για την προστασία των προσωπικών σας δεδομένων από μη εξουσιοδοτημένη πρόσβαση, αλλοίωση ή διαγραφή.',
      },
    ],
  } : {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated',
    sections: [
      {
        title: 'What data we collect',
        content: `We only collect data that you provide to us through the contact form or during registration:\n\n• Full name\n• Email address\n• Phone number (optional)\n• Contact message`,
      },
      {
        title: 'Why we collect it',
        content: `Your data is used exclusively to:\n\n• Respond to your message\n• Inform you about our services\n• Manage your account (if you register)\n\nWe do not share your data with third parties.`,
      },
      {
        title: 'How long we keep it',
        content: 'Your data is retained for as long as necessary for the purpose it was collected. If there is no active relationship, data is deleted within 12 months.',
      },
      {
        title: 'Your rights',
        content: `You have the right to:\n\n• Request access to your data\n• Request correction or deletion\n• Withdraw your consent at any time\n\nFor any request, contact us at ${contactEmail || 'our email'}.`,
      },
      {
        title: 'Data security',
        content: 'We take appropriate technical and organizational measures to protect your personal data from unauthorized access, alteration, or deletion.',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead path="/privacy-policy" />
      <Navigation user={user} isAdmin={isAdmin} />

      <main className="flex-grow pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">
            {content.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {content.lastUpdated}: {new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')}
          </p>

          <div className="space-y-8">
            {content.sections.map((section, index) => (
              <div key={index}>
                <h2 className="text-xl font-semibold mb-3 text-foreground">
                  {index + 1}. {section.title}
                </h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
