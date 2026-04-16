import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";

import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import MyBookings from "./pages/MyBookings";
import Admin from "./pages/Admin";
import CustomerPortal from "./pages/CustomerPortal";
import TrainerPortal from "./pages/TrainerPortal";
import ProtectedRoute from "./components/ProtectedRoute";
import TrainerManager from "./pages/admin/TrainerManager";
import ClassEditor from "./pages/admin/ClassEditor";
import Settings from "./pages/admin/Settings";
import NewsletterComposer from "./pages/admin/NewsletterComposer";
import TemplateBuilder from "./pages/admin/TemplateBuilder";
import EmailTemplates from "./pages/admin/EmailTemplates";
import UserProfile from "./pages/admin/UserProfile";
import BulkUserManagement from "./pages/admin/BulkUserManagement";
import Members from "./pages/admin/Members";
import Bookings from "./pages/admin/Bookings";
import Memberships from "./pages/Memberships";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import CronJobs from "./pages/admin/CronJobs";
import TrainerProfile from "./pages/trainer/TrainerProfile";
import CustomerProfile from "./pages/customer/CustomerProfile";
import FitnessAssistant from "./pages/customer/FitnessAssistant";
import SavedPrograms from "./pages/customer/SavedPrograms";
import TrainerClasses from "./pages/trainer/TrainerClasses";
import TrainerBookings from "./pages/trainer/TrainerBookings";
import CRM from "./pages/admin/CRM";
import CRMCustomerDetail from "./pages/admin/CRMCustomerDetail";
import CreateUser from "./pages/admin/CreateUser";
import Invoices from "./pages/admin/Invoices";
import InvoiceSettings from "./pages/admin/InvoiceSettings";
import Packages from "./pages/admin/Packages";
import InvoiceDetail from "./pages/admin/InvoiceDetail";
import PageBuilder from "./pages/admin/PageBuilder";
import DynamicPage from "./pages/DynamicPage";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Install from "./pages/Install";
import { DynamicFavicon } from "./components/DynamicFavicon";
import { InstallPromptBanner } from "./components/InstallPromptBanner";
const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <DynamicFavicon />
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <InstallPromptBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/install" element={<Install />} />
          <Route path="/virtual-tour" element={<DynamicPage pageKeyOverride="virtual-tour" />} />
          
          {/* Dynamic pages from Page Builder */}
          <Route path="/page/:pageKey" element={<DynamicPage />} />
            
            {/* Customer routes */}
            <Route path="/customer/*" element={
              <ProtectedRoute allowedRoles={['member']}>
                <CustomerPortal />
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={<MyBookings />} />
            
            {/* Trainer routes */}
            <Route path="/trainer/schedule" element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerPortal />
              </ProtectedRoute>
            } />
            <Route path="/trainer/classes" element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerClasses />
              </ProtectedRoute>
            } />
            <Route path="/trainer/profile" element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerProfile />
              </ProtectedRoute>
            } />
            <Route path="/trainer/bookings" element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerBookings />
              </ProtectedRoute>
            } />
            
            {/* Customer routes - Add specific profile route */}
            <Route path="/customer/profile" element={
              <ProtectedRoute allowedRoles={['member']}>
                <CustomerProfile />
              </ProtectedRoute>
            } />
            <Route path="/customer/ai-coach" element={
              <ProtectedRoute allowedRoles={['member']}>
                <FitnessAssistant />
              </ProtectedRoute>
            } />
            <Route path="/customer/saved-programs" element={
              <ProtectedRoute allowedRoles={['member']}>
                <SavedPrograms />
              </ProtectedRoute>
            } />
            <Route path="/customer/*" element={
              <ProtectedRoute allowedRoles={['member']}>
                <CustomerPortal />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/admin/newsletter" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <NewsletterComposer />
              </ProtectedRoute>
            } />
            <Route path="/admin/email-templates" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmailTemplates />
              </ProtectedRoute>
            } />
            <Route path="/admin/template-builder" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TemplateBuilder />
              </ProtectedRoute>
            } />
            <Route path="/admin/trainers" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TrainerManager />
              </ProtectedRoute>
            } />
            <Route path="/admin/classes" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClassEditor />
              </ProtectedRoute>
            } />
            <Route path="/admin/users/:userId" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin/bulk-users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BulkUserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/members" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Members />
              </ProtectedRoute>
            } />
            <Route path="/admin/bookings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Bookings />
              </ProtectedRoute>
            } />
            <Route path="/admin/cron-jobs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CronJobs />
              </ProtectedRoute>
            } />
            <Route path="/admin/crm" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CRM />
              </ProtectedRoute>
            } />
            <Route path="/admin/crm/customer/new" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateUser />
              </ProtectedRoute>
            } />
            <Route path="/admin/crm/customer/:id" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CRMCustomerDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/invoices" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Invoices />
              </ProtectedRoute>
            } />
            <Route path="/admin/invoices/:id" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InvoiceDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/invoice-settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InvoiceSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/packages" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Packages />
              </ProtectedRoute>
            } />
            <Route path="/admin/page-builder" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageBuilder />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
