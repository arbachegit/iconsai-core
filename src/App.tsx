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
import { useApiRegistrySync } from "./hooks/useApiRegistrySync";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Lazy load non-critical pages
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminSignup = lazy(() => import("./pages/AdminSignup"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Arquitetura = lazy(() => import("./pages/Arquitetura"));
const DashboardAdmin = lazy(() => import("./pages/DashboardAdmin"));
const AppPage = lazy(() => import("./pages/AppPage"));
const Hub = lazy(() => import("./pages/Hub"));

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

// Component that activates API Registry sync
const ApiRegistrySyncProvider = ({ children }: { children: React.ReactNode }) => {
  useApiRegistrySync();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AudioPlayerProvider>
      <TooltipProvider>
        <ApiRegistrySyncProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/signup" element={<AdminSignup />} />
                <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                
                {/* Protected Routes */}
                <Route path="/hub" element={
                  <ProtectedRoute requiredRole="superadmin">
                    <Hub />
                  </ProtectedRoute>
                } />
                <Route path="/app" element={
                  <ProtectedRoute>
                    <AppPage />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute requiredRole="admin">
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="superadmin">
                    <Admin />
                  </ProtectedRoute>
                } />
                
                {/* Public Routes */}
                <Route path="/docs" element={<Documentation />} />
                <Route path="/arquitetura" element={<Arquitetura />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          {/* Global Floating Audio Player */}
          <FloatingAudioPlayer />
        </ApiRegistrySyncProvider>
      </TooltipProvider>
    </AudioPlayerProvider>
  </QueryClientProvider>
);

export default App;
