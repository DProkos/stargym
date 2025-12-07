import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Type, 
  FileText, 
  Square, 
  Phone, 
  Image as ImageIcon,
  Package,
  Plus,
  Star,
  Dumbbell,
  Users,
  Clock
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  section_type: string;
  preview_data: {
    title?: string;
    title_en?: string;
    title_el?: string;
    subtitle?: string;
    subtitle_en?: string;
    subtitle_el?: string;
    content?: string;
    content_en?: string;
    content_el?: string;
    background_color?: string;
    text_color?: string;
    settings?: any;
  };
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  // Hero Templates
  {
    id: 'hero-gym-main',
    name: 'Hero Γυμναστήριο',
    description: 'Εντυπωσιακό hero section με background image για γυμναστήριο',
    section_type: 'hero',
    icon: Sparkles,
    category: 'Hero',
    preview_data: {
      title_en: 'Transform Your Body, Transform Your Life',
      title_el: 'Μεταμόρφωσε το Σώμα σου, Μεταμόρφωσε τη Ζωή σου',
      subtitle_en: 'Join the best gym in town and start your fitness journey today',
      subtitle_el: 'Γίνε μέλος στο καλύτερο γυμναστήριο της πόλης',
      background_color: 'dark',
      text_color: 'light',
      settings: {
        showCTA: true,
        ctaText: 'Get Started',
        ctaLink: '/pricing'
      }
    }
  },
  {
    id: 'hero-fitness-challenge',
    name: 'Hero Πρόκληση',
    description: 'Hero section για fitness challenge ή ειδικό πρόγραμμα',
    section_type: 'hero',
    icon: Star,
    category: 'Hero',
    preview_data: {
      title_en: '30-Day Fitness Challenge',
      title_el: '30ήμερη Πρόκληση Fitness',
      subtitle_en: 'Join hundreds of members who transformed their lives',
      subtitle_el: 'Γίνε μέρος της αλλαγής με εκατοντάδες μέλη',
      background_color: 'primary',
      text_color: 'light',
      settings: {
        showCTA: true,
        ctaText: 'Join Now',
        ctaLink: '/auth'
      }
    }
  },
  // Features Templates
  {
    id: 'features-gym-benefits',
    name: 'Πλεονεκτήματα Γυμναστηρίου',
    description: 'Grid με τα βασικά πλεονεκτήματα του γυμναστηρίου',
    section_type: 'features',
    icon: Square,
    category: 'Features',
    preview_data: {
      title_en: 'Why Choose Us?',
      title_el: 'Γιατί να μας Επιλέξεις;',
      subtitle_en: 'Everything you need for your fitness journey',
      subtitle_el: 'Όλα όσα χρειάζεσαι για την άθληση',
      settings: {
        features: [
          { icon: 'Dumbbell', title: 'Σύγχρονος Εξοπλισμός', description: 'Τελευταίας τεχνολογίας μηχανήματα' },
          { icon: 'Users', title: 'Έμπειροι Γυμναστές', description: 'Πιστοποιημένοι personal trainers' },
          { icon: 'Clock', title: '24/7 Πρόσβαση', description: 'Γυμνάσου όποτε θέλεις' },
          { icon: 'Star', title: 'Αποτελέσματα', description: 'Εγγυημένη πρόοδος' }
        ]
      }
    }
  },
  {
    id: 'features-classes',
    name: 'Μαθήματα Grid',
    description: 'Grid με τα διαθέσιμα ομαδικά προγράμματα',
    section_type: 'features',
    icon: Dumbbell,
    category: 'Features',
    preview_data: {
      title_en: 'Our Classes',
      title_el: 'Τα Μαθήματά μας',
      subtitle_en: 'Find the perfect class for you',
      subtitle_el: 'Βρες το τέλειο πρόγραμμα για εσένα',
      settings: {
        features: [
          { icon: 'Flame', title: 'CrossFit', description: 'Υψηλής έντασης προπόνηση' },
          { icon: 'Heart', title: 'Yoga', description: 'Χαλάρωση και ευλυγισία' },
          { icon: 'Zap', title: 'HIIT', description: 'Γρήγορα αποτελέσματα' },
          { icon: 'Bike', title: 'Spinning', description: 'Καρδιαγγειακή άσκηση' }
        ]
      }
    }
  },
  // CTA Templates
  {
    id: 'cta-join-now',
    name: 'CTA Εγγραφή',
    description: 'Call to action για εγγραφή νέων μελών',
    section_type: 'cta',
    icon: Sparkles,
    category: 'CTA',
    preview_data: {
      title_en: 'Ready to Start Your Journey?',
      title_el: 'Έτοιμος να Ξεκινήσεις;',
      subtitle_en: 'Join today and get 20% off your first month',
      subtitle_el: 'Γράψου σήμερα και πάρε 20% έκπτωση τον πρώτο μήνα',
      background_color: 'primary',
      text_color: 'light',
      settings: {
        ctaText: 'Join Now',
        ctaLink: '/pricing'
      }
    }
  },
  {
    id: 'cta-free-trial',
    name: 'CTA Δωρεάν Δοκιμή',
    description: 'Call to action για δωρεάν δοκιμαστικό μάθημα',
    section_type: 'cta',
    icon: Star,
    category: 'CTA',
    preview_data: {
      title_en: 'Try a Free Class',
      title_el: 'Δοκίμασε ένα Δωρεάν Μάθημα',
      subtitle_en: 'Experience our gym before committing',
      subtitle_el: 'Γνώρισε το γυμναστήριό μας πριν δεσμευτείς',
      background_color: 'secondary',
      text_color: 'light',
      settings: {
        ctaText: 'Book Free Trial',
        ctaLink: '/contact'
      }
    }
  },
  // Text Templates
  {
    id: 'text-about-us',
    name: 'Σχετικά με Εμάς',
    description: 'Text section με την ιστορία του γυμναστηρίου',
    section_type: 'text',
    icon: FileText,
    category: 'Text',
    preview_data: {
      title_en: 'About Us',
      title_el: 'Σχετικά με Εμάς',
      content_en: 'Since 2010, we have been helping our community achieve their fitness goals. Our state-of-the-art facility and experienced trainers are dedicated to your success.',
      content_el: 'Από το 2010, βοηθάμε την κοινότητά μας να πετύχει τους στόχους της. Οι σύγχρονες εγκαταστάσεις και οι έμπειροι γυμναστές μας είναι αφοσιωμένοι στην επιτυχία σου.',
      background_color: 'default',
      text_color: 'default'
    }
  },
  {
    id: 'text-mission',
    name: 'Αποστολή μας',
    description: 'Text section με το όραμα και αποστολή',
    section_type: 'text',
    icon: Type,
    category: 'Text',
    preview_data: {
      title_en: 'Our Mission',
      title_el: 'Η Αποστολή μας',
      content_en: 'To empower individuals to lead healthier, happier lives through fitness and community support.',
      content_el: 'Να ενδυναμώσουμε τους ανθρώπους να ζουν πιο υγιεινές και ευτυχισμένες ζωές μέσω της άσκησης και της κοινότητας.',
      background_color: 'muted',
      text_color: 'default'
    }
  },
  // Contact Templates
  {
    id: 'contact-form-simple',
    name: 'Φόρμα Επικοινωνίας',
    description: 'Απλή φόρμα επικοινωνίας',
    section_type: 'contact_form',
    icon: Phone,
    category: 'Contact',
    preview_data: {
      title_en: 'Get in Touch',
      title_el: 'Επικοινωνήστε μαζί μας',
      subtitle_en: 'Have questions? We are here to help!',
      subtitle_el: 'Έχετε απορίες; Είμαστε εδώ για εσάς!',
      background_color: 'default',
      text_color: 'default'
    }
  },
  {
    id: 'contact-info-full',
    name: 'Πληροφορίες Επικοινωνίας',
    description: 'Πλήρεις πληροφορίες επικοινωνίας με χάρτη',
    section_type: 'contact_info',
    icon: Phone,
    category: 'Contact',
    preview_data: {
      title_en: 'Visit Us',
      title_el: 'Επισκεφθείτε μας',
      subtitle_en: 'Find us at our location',
      subtitle_el: 'Βρείτε μας στη διεύθυνσή μας',
      background_color: 'muted',
      text_color: 'default'
    }
  },
  // Packages Template
  {
    id: 'packages-pricing',
    name: 'Πακέτα Τιμών',
    description: 'Εμφάνιση πακέτων υπηρεσιών',
    section_type: 'packages',
    icon: Package,
    category: 'Pricing',
    preview_data: {
      title_en: 'Our Packages',
      title_el: 'Τα Πακέτα μας',
      subtitle_en: 'Choose the perfect plan for you',
      subtitle_el: 'Επιλέξτε το ιδανικό πλάνο για εσάς',
      background_color: 'default',
      text_color: 'default'
    }
  },
  // Header Templates
  {
    id: 'header-page-title',
    name: 'Τίτλος Σελίδας',
    description: 'Απλός header με τίτλο σελίδας',
    section_type: 'header',
    icon: Type,
    category: 'Header',
    preview_data: {
      title_en: 'Page Title',
      title_el: 'Τίτλος Σελίδας',
      subtitle_en: 'Page description goes here',
      subtitle_el: 'Περιγραφή σελίδας εδώ',
      background_color: 'muted',
      text_color: 'default'
    }
  },
  // Image Templates
  {
    id: 'image-gallery',
    name: 'Εικόνα Gallery',
    description: 'Section με εικόνα του γυμναστηρίου',
    section_type: 'image',
    icon: ImageIcon,
    category: 'Image',
    preview_data: {
      title_en: 'Our Facility',
      title_el: 'Οι Εγκαταστάσεις μας',
      subtitle_en: 'Take a look at our modern gym',
      subtitle_el: 'Δείτε το σύγχρονο γυμναστήριό μας',
      background_color: 'default',
      text_color: 'default'
    }
  }
];

const CATEGORIES = [...new Set(SECTION_TEMPLATES.map(t => t.category))];

interface SectionTemplatesProps {
  activePage: string;
  onApplyTemplate: (template: SectionTemplate) => Promise<void>;
}

export function SectionTemplates({ activePage, onApplyTemplate }: SectionTemplatesProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Section Templates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Επιλέξτε ένα έτοιμο template για να το προσθέσετε στη σελίδα "{activePage}"
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-8">
              {CATEGORIES.map(category => (
                <div key={category}>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Badge variant="outline">{category}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SECTION_TEMPLATES.filter(t => t.category === category).map(template => (
                      <Card key={template.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <template.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {template.section_type}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-4"
                            onClick={() => onApplyTemplate(template)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Προσθήκη
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export type { SectionTemplate };
