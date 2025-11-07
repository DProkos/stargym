import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Classes from "./pages/Classes";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import MyBookings from "./pages/MyBookings";
import Admin from "./pages/Admin";
import CustomerPortal from "./pages/CustomerPortal";
import TrainerPortal from "./pages/TrainerPortal";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Customer routes */}
            <Route path="/customer/*" element={
              <ProtectedRoute allowedRoles={['member']}>
                <CustomerPortal />
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={<MyBookings />} />
            
            {/* Trainer routes */}
            <Route path="/trainer/*" element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerPortal />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
