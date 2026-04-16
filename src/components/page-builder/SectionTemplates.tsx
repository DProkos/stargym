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
  Clock,
  Brain,
  Download,
  Smartphone,
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

// Preview component for visual thumbnails
const TemplatePreview = ({ template }: { template: SectionTemplate }) => {
  const { section_type, preview_data } = template;
  
  const getBgClass = () => {
    switch (preview_data.background_color) {
      case 'primary': return 'bg-primary';
      case 'secondary': return 'bg-secondary';
      case 'dark': return 'bg-zinc-900';
      case 'muted': return 'bg-muted';
      default: return 'bg-background';
    }
  };
  
  const getTextClass = () => {
    return preview_data.text_color === 'light' ? 'text-white' : 'text-foreground';
  };

  // Mini preview based on section type
  switch (section_type) {
    case 'hero':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-3 flex flex-col justify-center items-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
          <div className="relative z-10 text-center">
            <div className="text-[8px] font-bold truncate max-w-full">{preview_data.title_el || preview_data.title_en}</div>
            <div className="text-[6px] opacity-80 truncate max-w-full">{preview_data.subtitle_el || preview_data.subtitle_en}</div>
            <div className="mt-1 bg-white/20 rounded px-2 py-0.5 text-[5px]">CTA</div>
          </div>
        </div>
      );
    
    case 'features':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2 overflow-hidden`}>
          <div className="text-[7px] font-bold text-center mb-1 truncate">{preview_data.title_el || preview_data.title_en}</div>
          <div className="grid grid-cols-2 gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-primary/20 rounded p-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                <div className="w-full h-1 bg-current/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'cta':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-3 flex flex-col justify-center items-center`}>
          <div className="text-[8px] font-bold text-center truncate max-w-full">{preview_data.title_el || preview_data.title_en}</div>
          <div className="text-[6px] opacity-80 text-center truncate max-w-full">{preview_data.subtitle_el || preview_data.subtitle_en}</div>
          <div className="mt-2 bg-white text-primary rounded px-3 py-0.5 text-[6px] font-medium">
            {preview_data.settings?.ctaText || 'Button'}
          </div>
        </div>
      );
    
    case 'text':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-3`}>
          <div className="text-[8px] font-bold mb-1 truncate">{preview_data.title_el || preview_data.title_en}</div>
          <div className="space-y-0.5">
            <div className="w-full h-1 bg-current/20 rounded" />
            <div className="w-4/5 h-1 bg-current/20 rounded" />
            <div className="w-3/4 h-1 bg-current/20 rounded" />
          </div>
        </div>
      );
    
    case 'contact_form':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2`}>
          <div className="text-[7px] font-bold mb-1 truncate">{preview_data.title_el || preview_data.title_en}</div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-current/10 rounded border border-current/20" />
            <div className="w-full h-2 bg-current/10 rounded border border-current/20" />
            <div className="w-full h-4 bg-current/10 rounded border border-current/20" />
          </div>
        </div>
      );
    
    case 'contact_info':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2`}>
          <div className="text-[7px] font-bold mb-1 truncate">{preview_data.title_el || preview_data.title_en}</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Phone className="w-2 h-2" />
                <div className="w-8 h-1 bg-current/20 rounded" />
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-2 h-2" />
                <div className="w-6 h-1 bg-current/20 rounded" />
              </div>
            </div>
            <div className="bg-current/10 rounded h-full" />
          </div>
        </div>
      );
    
    case 'packages':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2`}>
          <div className="text-[7px] font-bold text-center mb-1 truncate">{preview_data.title_el || preview_data.title_en}</div>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-6 bg-current/10 rounded p-1 ${i === 2 ? 'h-10 border-2 border-primary' : 'h-8'}`}>
                <div className="w-full h-1 bg-current/30 rounded mb-1" />
                <div className="w-full h-0.5 bg-current/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'header':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-3 flex flex-col justify-center items-center`}>
          <div className="text-[10px] font-bold truncate max-w-full">{preview_data.title_el || preview_data.title_en}</div>
          <div className="text-[7px] opacity-60 truncate max-w-full">{preview_data.subtitle_el || preview_data.subtitle_en}</div>
          <div className="w-8 h-0.5 bg-primary mt-1 rounded" />
        </div>
      );
    
    case 'image':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2 flex items-center gap-2`}>
          <div className="w-12 h-full bg-gradient-to-br from-primary/30 to-primary/10 rounded flex items-center justify-center">
            <ImageIcon className="w-4 h-4 opacity-50" />
          </div>
          <div className="flex-1">
            <div className="text-[7px] font-bold truncate">{preview_data.title_el || preview_data.title_en}</div>
            <div className="text-[6px] opacity-60 truncate">{preview_data.subtitle_el || preview_data.subtitle_en}</div>
          </div>
        </div>
      );
    
    case 'gallery':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2`}>
          <div className="text-[7px] font-bold text-center mb-1 truncate">{preview_data.title_el || preview_data.title_en}</div>
          <div className="flex gap-1 justify-center items-end">
            <div className="w-6 h-8 bg-gradient-to-br from-primary/40 to-primary/20 rounded opacity-60 transform -rotate-6" />
            <div className="w-8 h-10 bg-gradient-to-br from-primary/50 to-primary/30 rounded shadow-lg transform scale-110 z-10" />
            <div className="w-6 h-8 bg-gradient-to-br from-primary/40 to-primary/20 rounded opacity-60 transform rotate-6" />
          </div>
        </div>
      );
    
    case 'ai_coach':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Brain className="w-2.5 h-2.5 text-primary" />
              <div className="text-[6px] font-bold text-primary">AI POWERED</div>
            </div>
            <div className="text-[8px] font-bold text-center truncate">{preview_data.title_el || preview_data.title_en}</div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {[Brain, Dumbbell, Sparkles].map((Icon, i) => (
                <div key={i} className="bg-current/10 rounded p-1 flex items-center justify-center">
                  <Icon className="w-2 h-2 text-primary" />
                </div>
              ))}
            </div>
            <div className="mt-1 mx-auto bg-primary text-primary-foreground rounded px-2 py-0.5 text-[5px] font-medium w-fit">
              Start Now
            </div>
          </div>
        </div>
      );

    case 'pwa_install':
      return (
        <div className={`w-full h-24 rounded-md ${getBgClass()} ${getTextClass()} p-2 relative overflow-hidden flex flex-col items-center justify-center`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
          <div className="relative z-10 text-center">
            <div className="w-6 h-6 mx-auto rounded-md bg-primary/20 flex items-center justify-center mb-1">
              <Download className="w-3 h-3 text-primary" />
            </div>
            <div className="text-[7px] font-bold truncate max-w-[90px] mx-auto">{preview_data.title_el || preview_data.title_en}</div>
            <div className="mt-1 bg-primary text-primary-foreground rounded px-2 py-0.5 text-[5px] font-medium inline-flex items-center gap-0.5">
              <Download className="w-1.5 h-1.5" /> Install
            </div>
            <div className="flex justify-center gap-2 mt-1 text-[5px] opacity-60">
              <span>iOS</span><span>Android</span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full h-24 rounded-md bg-muted flex items-center justify-center">
          <template.icon className="h-6 w-6 text-muted-foreground" />
        </div>
      );
  }
};

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
  },
  // 3D Gallery Templates
  {
    id: 'gallery-3d-tour',
    name: '3D Gallery Περιήγηση',
    description: 'Εντυπωσιακό 3D carousel με φωτογραφίες του χώρου',
    section_type: 'gallery',
    icon: ImageIcon,
    category: 'Gallery',
    preview_data: {
      title_en: 'Explore Our Space',
      title_el: 'Περιηγηθείτε στο χώρο μας',
      subtitle_en: 'Discover our modern gym facilities',
      subtitle_el: 'Ανακαλύψτε τους σύγχρονους χώρους του γυμναστηρίου μας',
      background_color: 'default',
      text_color: 'default',
      settings: {
        images: [
          { src: '', alt: 'Αίθουσα Βαρών' },
          { src: '', alt: 'Χώρος Cardio' },
          { src: '', alt: 'Αίθουσα Group Fitness' }
        ]
      }
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">Section Templates</span>
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground break-words">
            Επιλέξτε ένα έτοιμο template για να το προσθέσετε στη σελίδα "{activePage}"
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <ScrollArea className="h-[600px] pr-2 sm:pr-4">
            <div className="space-y-6 sm:space-y-8">
              {CATEGORIES.map(category => (
                <div key={category}>
                  <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                    <Badge variant="outline">{category}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {SECTION_TEMPLATES.filter(t => t.category === category).map(template => (
                      <Card key={template.id} className="hover:border-primary/50 transition-colors group">
                        <CardContent className="p-3">
                          {/* Visual Preview Thumbnail */}
                          <div className="mb-3 border rounded-md overflow-hidden shadow-sm">
                            <TemplatePreview template={template} />
                          </div>
                          
                          {/* Template Info */}
                          <div className="flex items-start gap-2 mb-3">
                            <div className="p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                              <template.icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            className="w-full"
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
