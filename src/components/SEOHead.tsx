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
        ? 'Γυμναστήριο Μενίδι | Star Gym - Κορυφαίο Fitness Center'
        : 'Star Gym Menidi | Elite Fitness Training Center',
      description: language === 'el'
        ? 'Γυμναστήριο στο Μενίδι Αττικής. Personal training, ομαδικά προγράμματα, σύγχρονος εξοπλισμός, έμπειροι γυμναστές και κορυφαίες εγκαταστάσεις.'
        : 'Gym in Menidi, Attica. Personal training, group classes, state-of-the-art equipment, expert trainers, and world-class facilities.',
    },
    pricing: {
      title: language === 'el'
        ? 'Τιμοκατάλογος Γυμναστηρίου Μενίδι | Star Gym'
        : 'Gym Pricing Plans Menidi | Star Gym',
      description: language === 'el'
        ? 'Τιμές γυμναστηρίου στο Μενίδι. Ανακαλύψτε τα πακέτα συνδρομής μας. Ευέλικτα πλάνα για κάθε ανάγκη και στόχο.'
        : 'Gym pricing in Menidi. Discover our membership plans. Flexible packages for every need and fitness goal.',
    },
    contact: {
      title: language === 'el'
        ? 'Επικοινωνία | Star Gym Μενίδι'
        : 'Contact Us | Star Gym Menidi',
      description: language === 'el'
        ? 'Επικοινωνήστε με το γυμναστήριο Star Gym στο Μενίδι Αττικής. Διεύθυνση, τηλέφωνο και ωράριο λειτουργίας.'
        : 'Contact Star Gym in Menidi, Attica. Find our address, phone number, and operating hours.',
    },
    memberships: {
      title: language === 'el'
        ? 'Συνδρομές Γυμναστηρίου Μενίδι | Star Gym'
        : 'Gym Memberships Menidi | Star Gym',
      description: language === 'el'
        ? 'Εγγραφείτε στο Star Gym στο Μενίδι. Personal training, ομαδικά προγράμματα και σύγχρονος εξοπλισμός.'
        : 'Join Star Gym in Menidi. Personal training, group classes, and modern equipment.',
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
      addressLocality: 'Μενίδι',
      addressRegion: 'Αττική',
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
