import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'el';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTransitioning: boolean;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.classes': 'Classes',
    'nav.pricing': 'Pricing',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.dashboard': 'Dashboard',
    'nav.myBookings': 'My Bookings',
    'nav.customer': 'Customer Portal',
    'nav.trainer': 'Trainer Portal',
    'nav.admin': 'Admin Portal',
    'nav.profile': 'Profile',
    
    // Hero
    'hero.title': 'Transform Your Body',
    'hero.subtitle': 'Elite fitness training with world-class facilities',
    'hero.cta': 'Book Free Trial',
    'hero.cta2': 'View Classes',
    
    // About
    'about.title': 'World-Class Facilities',
    'about.desc': 'State-of-the-art equipment, expert trainers, and a supportive community',
    
    // Classes
    'classes.title': 'Our Classes',
    'classes.subtitle': 'Find your perfect workout',
    'classes.duration': 'Duration',
    'classes.capacity': 'Capacity',
    'classes.trainer': 'Trainer',
    'classes.book': 'Book Class',
    
    // Pricing
    'pricing.title': 'Membership Plans',
    'pricing.subtitle': 'Choose the perfect plan for your fitness journey',
    'pricing.monthly': 'Monthly',
    'pricing.annual': 'Annual',
    'pricing.perMonth': '/month',
    'pricing.selectPlan': 'Select Plan',
    
    // Contact
    'contact.title': 'Get In Touch',
    'contact.subtitle': 'Have questions? We\'re here to help',
    'contact.name': 'Name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.message': 'Message',
    'contact.send': 'Send Message',
    'contact.location': 'Location',
    'contact.hours': 'Opening Hours',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.haveAccount': 'Already have an account?',
    'auth.createAccount': 'Create your account',
    'auth.welcomeBack': 'Welcome back',
    
    // Dashboard
    'dashboard.members': 'Members',
    'dashboard.classes': 'Classes',
    'dashboard.bookings': 'Bookings',
    'dashboard.overview': 'Overview',
    'dashboard.manageMembers': 'Manage Members',
    'dashboard.manageClasses': 'Manage Classes',
    'dashboard.viewBookings': 'View Bookings',
    
    // Trainer
    'trainer.schedule': 'My Schedule',
    'trainer.classes': 'My Classes',
    
    // Admin
    'admin.dashboard': 'Dashboard',
    'admin.members': 'Members',
    'admin.bookings': 'Bookings',
    'admin.trainers': 'Trainers',
    'admin.classes': 'Classes',
    
    // Booking
    'booking.selectDate': 'Select Date',
    'booking.confirm': 'Confirm Booking',
    'booking.cancel': 'Cancel Booking',
    'booking.success': 'Booking confirmed!',
    'booking.myBookings': 'My Bookings',
    
    // Days
    'day.monday': 'Monday',
    'day.tuesday': 'Tuesday',
    'day.wednesday': 'Wednesday',
    'day.thursday': 'Thursday',
    'day.friday': 'Friday',
    'day.saturday': 'Saturday',
    'day.sunday': 'Sunday',
    
    // Home Page
    'home.features.equipment.title': 'Modern Equipment',
    'home.features.equipment.desc': 'Latest fitness technology and equipment',
    'home.features.trainers.title': 'Expert Trainers',
    'home.features.trainers.desc': 'Certified professionals to guide you',
    'home.features.results.title': 'Proven Results',
    'home.features.results.desc': 'Thousands of success stories',
    'home.features.hours.title': 'Flexible Hours',
    'home.features.hours.desc': 'Open early morning to late night',
    'home.cta.ready': 'Ready to Start Your Journey?',
    'home.cta.join': 'Join hundreds of members transforming their lives',
    
    // Memberships
    'memberships.title': 'Membership Plans',
    'memberships.subtitle': 'Choose the perfect plan for your fitness journey',
    'memberships.perMonth': '/month',
    'memberships.subscribe': 'Subscribe',
    'memberships.currentPlan': 'Current Plan',
    'memberships.comingSoon': 'Stripe checkout integration coming soon. Please configure your Stripe API keys in admin settings.',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.yes': 'Yes',
    'common.no': 'No',
  },
  el: {
    // Navigation
    'nav.home': 'Αρχική',
    'nav.classes': 'Μαθήματα',
    'nav.pricing': 'Τιμές',
    'nav.contact': 'Επικοινωνία',
    'nav.login': 'Σύνδεση',
    'nav.logout': 'Αποσύνδεση',
    'nav.dashboard': 'Πίνακας Ελέγχου',
    'nav.myBookings': 'Οι Κρατήσεις Μου',
    'nav.customer': 'Πύλη Πελάτη',
    'nav.trainer': 'Πύλη Προπονητή',
    'nav.admin': 'Πύλη Διαχειριστή',
    'nav.profile': 'Προφίλ',
    
    // Hero
    'hero.title': 'Μεταμόρφωσε το Σώμα σου',
    'hero.subtitle': 'Προπόνηση κορυφαίου επιπέδου με εγκαταστάσεις παγκόσμιας κλάσης',
    'hero.cta': 'Δωρεάν Δοκιμή',
    'hero.cta2': 'Μαθήματα',
    
    // About
    'about.title': 'Εγκαταστάσεις Παγκόσμιας Κλάσης',
    'about.desc': 'Υπερσύγχρονος εξοπλισμός, ειδικοί προπονητές και υποστηρικτική κοινότητα',
    
    // Classes
    'classes.title': 'Τα Μαθήματα Μας',
    'classes.subtitle': 'Βρες την τέλεια προπόνηση',
    'classes.duration': 'Διάρκεια',
    'classes.capacity': 'Χωρητικότητα',
    'classes.trainer': 'Προπονητής',
    'classes.book': 'Κράτηση',
    
    // Pricing
    'pricing.title': 'Πακέτα Συνδρομής',
    'pricing.subtitle': 'Επίλεξε το ιδανικό πλάνο για το ταξίδι φυσικής κατάστασης',
    'pricing.monthly': 'Μηνιαίο',
    'pricing.annual': 'Ετήσιο',
    'pricing.perMonth': '/μήνα',
    'pricing.selectPlan': 'Επιλογή Πλάνου',
    
    // Contact
    'contact.title': 'Επικοινωνήστε Μαζί Μας',
    'contact.subtitle': 'Έχετε ερωτήσεις; Είμαστε εδώ για να βοηθήσουμε',
    'contact.name': 'Όνομα',
    'contact.email': 'Email',
    'contact.phone': 'Τηλέφωνο',
    'contact.message': 'Μήνυμα',
    'contact.send': 'Αποστολή Μηνύματος',
    'contact.location': 'Τοποθεσία',
    'contact.hours': 'Ωράριο Λειτουργίας',
    
    // Auth
    'auth.signIn': 'Σύνδεση',
    'auth.signUp': 'Εγγραφή',
    'auth.email': 'Email',
    'auth.password': 'Κωδικός',
    'auth.fullName': 'Ονοματεπώνυμο',
    'auth.noAccount': 'Δεν έχετε λογαριασμό;',
    'auth.haveAccount': 'Έχετε ήδη λογαριασμό;',
    'auth.createAccount': 'Δημιουργήστε τον λογαριασμό σας',
    'auth.welcomeBack': 'Καλώς ήρθατε πίσω',
    
    // Dashboard
    'dashboard.members': 'Μέλη',
    'dashboard.classes': 'Μαθήματα',
    'dashboard.bookings': 'Κρατήσεις',
    'dashboard.overview': 'Επισκόπηση',
    'dashboard.manageMembers': 'Διαχείριση Μελών',
    'dashboard.manageClasses': 'Διαχείριση Μαθημάτων',
    'dashboard.viewBookings': 'Προβολή Κρατήσεων',
    
    // Trainer
    'trainer.schedule': 'Το Πρόγραμμά Μου',
    'trainer.classes': 'Τα Μαθήματά Μου',
    
    // Admin
    'admin.dashboard': 'Πίνακας Ελέγχου',
    'admin.members': 'Μέλη',
    'admin.bookings': 'Κρατήσεις',
    'admin.trainers': 'Προπονητές',
    'admin.classes': 'Μαθήματα',
    
    // Booking
    'booking.selectDate': 'Επιλογή Ημερομηνίας',
    'booking.confirm': 'Επιβεβαίωση Κράτησης',
    'booking.cancel': 'Ακύρωση Κράτησης',
    'booking.success': 'Η κράτηση επιβεβαιώθηκε!',
    'booking.myBookings': 'Οι Κρατήσεις Μου',
    
    // Days
    'day.monday': 'Δευτέρα',
    'day.tuesday': 'Τρίτη',
    'day.wednesday': 'Τετάρτη',
    'day.thursday': 'Πέμπτη',
    'day.friday': 'Παρασκευή',
    'day.saturday': 'Σάββατο',
    'day.sunday': 'Κυριακή',
    
    // Home Page
    'home.features.equipment.title': 'Σύγχρονος Εξοπλισμός',
    'home.features.equipment.desc': 'Τελευταία τεχνολογία και εξοπλισμός φυσικής κατάστασης',
    'home.features.trainers.title': 'Ειδικοί Προπονητές',
    'home.features.trainers.desc': 'Πιστοποιημένοι επαγγελματίες για να σας καθοδηγήσουν',
    'home.features.results.title': 'Αποδεδειγμένα Αποτελέσματα',
    'home.features.results.desc': 'Χιλιάδες ιστορίες επιτυχίας',
    'home.features.hours.title': 'Ευέλικτο Ωράριο',
    'home.features.hours.desc': 'Ανοιχτά από νωρίς το πρωί έως αργά το βράδυ',
    'home.cta.ready': 'Έτοιμοι να Ξεκινήσετε το Ταξίδι σας;',
    'home.cta.join': 'Γίνετε μέλος εκατοντάδων ατόμων που μεταμορφώνουν τη ζωή τους',
    
    // Memberships
    'memberships.title': 'Πακέτα Συνδρομής',
    'memberships.subtitle': 'Επιλέξτε το τέλειο πλάνο για το ταξίδι φυσικής κατάστασης',
    'memberships.perMonth': '/μήνα',
    'memberships.subscribe': 'Εγγραφή',
    'memberships.currentPlan': 'Τρέχον Πλάνο',
    'memberships.comingSoon': 'Η ολοκλήρωση πληρωμής Stripe θα είναι σύντομα διαθέσιμη. Παρακαλώ ρυθμίστε τα κλειδιά API του Stripe στις ρυθμίσεις διαχειριστή.',
    
    // Common
    'common.loading': 'Φόρτωση...',
    'common.save': 'Αποθήκευση',
    'common.cancel': 'Ακύρωση',
    'common.delete': 'Διαγραφή',
    'common.edit': 'Επεξεργασία',
    'common.create': 'Δημιουργία',
    'common.update': 'Ενημέρωση',
    'common.search': 'Αναζήτηση',
    'common.filter': 'Φίλτρο',
    'common.actions': 'Ενέργειες',
    'common.status': 'Κατάσταση',
    'common.active': 'Ενεργό',
    'common.inactive': 'Ανενεργό',
    'common.yes': 'Ναι',
    'common.no': 'Όχι',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'el' || saved === 'en') ? saved : 'en';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSetLanguage = (lang: Language) => {
    if (lang === language) return;
    
    // Start transition animation
    setIsTransitioning(true);
    
    // Wait for fade out, then change language
    setTimeout(() => {
      setLanguage(lang);
      localStorage.setItem('language', lang);
      
      // Fade back in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 150);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, isTransitioning }}>
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};