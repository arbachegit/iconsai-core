import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { FloatingAudioPlayer } from "./components/FloatingAudioPlayer";

// Lazy load non-critical pages
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminSignup = lazy(() => import("./pages/AdminSignup"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Arquitetura = lazy(() => import("./pages/Arquitetura"));
const DashboardAdmin = lazy(() => import("./pages/DashboardAdmin"));

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AudioPlayerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/signup" element={<AdminSignup />} />
              <Route path="/admin/reset-password" element={<AdminResetPassword />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/dashboard" element={<DashboardAdmin />} />
              <Route path="/docs" element={<Documentation />} />
              <Route path="/arquitetura" element={<Arquitetura />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        {/* Global Floating Audio Player */}
        <FloatingAudioPlayer />
      </TooltipProvider>
    </AudioPlayerProvider>
  </QueryClientProvider>
);

export default App;
