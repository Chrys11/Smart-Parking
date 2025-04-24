
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import UserDashboard from "./components/UserDashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import Profile from "./pages/Profile";
import MobileNavBar from "./components/MobileNavBar";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

// Create a RouteChangeTracker component to handle splash screen on route changes
const RouteChangeTracker = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(false);
  const [previousLocation, setPreviousLocation] = useState("");
  
  useEffect(() => {
    // Only show splash screen if we're actually changing pages (not on initial load)
    if (previousLocation && previousLocation !== location.pathname) {
      setShowSplash(true);
    }
    setPreviousLocation(location.pathname);
  }, [location, previousLocation]);
  
  if (!showSplash) {
    return null;
  }
  
  return <SplashScreen onFinish={() => setShowSplash(false)} />;
};

const AppRoutes = () => {
  return (
    <>
      <RouteChangeTracker />
      <div className="pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MobileNavBar />
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
