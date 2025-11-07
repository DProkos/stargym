import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'el';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
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
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
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