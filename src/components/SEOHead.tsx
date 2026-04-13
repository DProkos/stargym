import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/contexts/LanguageContext';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
  image?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://stargym.lovable.app';
const DEFAULT_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/478526d8-f950-45b4-b122-b0d8c63f269a';

export function SEOHead({
  title,
  description,
  path = '',
  type = 'website',
  image = DEFAULT_IMAGE,
  noindex = false,
}: SEOHeadProps) {
  const { language } = useLanguage();

  const seoData: Record<string, { title: string; description: string }> = {
    home: {
      title: language === 'el'
        ? 'Star Gym - Κορυφαίο Γυμναστήριο & Fitness Center'
        : 'Star Gym - Elite Fitness Training Center',
      description: language === 'el'
        ? 'Μεταμορφώστε το σώμα σας με κορυφαία εκπαίδευση fitness. Σύγχρονος εξοπλισμός, έμπειροι γυμναστές και κορυφαίες εγκαταστάσεις.'
        : 'Transform your body with elite fitness training. State-of-the-art equipment, expert trainers, and world-class facilities.',
    },
    pricing: {
      title: language === 'el'
        ? 'Τιμοκατάλογος - Star Gym'
        : 'Pricing Plans - Star Gym',
      description: language === 'el'
        ? 'Ανακαλύψτε τα πακέτα συνδρομής μας. Ευέλικτα πλάνα για κάθε ανάγκη και στόχο.'
        : 'Discover our membership plans. Flexible packages for every need and fitness goal.',
    },
    contact: {
      title: language === 'el'
        ? 'Επικοινωνία - Star Gym'
        : 'Contact Us - Star Gym',
      description: language === 'el'
        ? 'Επικοινωνήστε μαζί μας για οποιαδήποτε ερώτηση. Βρείτε τη διεύθυνσή μας, τηλέφωνο και ωράριο λειτουργίας.'
        : 'Get in touch with us for any questions. Find our address, phone number, and operating hours.',
    },
    memberships: {
      title: language === 'el'
        ? 'Συνδρομές - Star Gym'
        : 'Memberships - Star Gym',
      description: language === 'el'
        ? 'Εγγραφείτε στο Star Gym και ξεκινήστε το ταξίδι σας στο fitness σήμερα.'
        : 'Join Star Gym and start your fitness journey today.',
    },
  };

  const pageKey = path === '' || path === '/' ? 'home' : path.replace('/', '');
  const defaults = seoData[pageKey] || seoData.home;

  const finalTitle = title || defaults.title;
  const finalDescription = description || defaults.description;
  const canonicalUrl = `${BASE_URL}${path}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: 'Star Gym',
    description: finalDescription,
    url: BASE_URL,
    image: image,
    sameAs: [],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'GR',
    },
  };

  return (
    <Helmet>
      <html lang={language} />
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={language === 'el' ? 'el_GR' : 'en_US'} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
