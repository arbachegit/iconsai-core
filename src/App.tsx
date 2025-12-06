import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load admin pages to prevent blocking main page
const Admin = React.lazy(() => import("./pages/Admin"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AdminSignup = React.lazy(() => import("./pages/AdminSignup"));
const AdminResetPassword = React.lazy(() => import("./pages/AdminResetPassword"));
const Documentation = React.lazy(() => import("./pages/Documentation"));

const queryClient = new QueryClient();

// Fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-primary">Carregando...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={
            <React.Suspense fallback={<PageLoader />}>
              <AdminLogin />
            </React.Suspense>
          } />
          <Route path="/admin/signup" element={
            <React.Suspense fallback={<PageLoader />}>
              <AdminSignup />
            </React.Suspense>
          } />
          <Route path="/admin/reset-password" element={
            <React.Suspense fallback={<PageLoader />}>
              <AdminResetPassword />
            </React.Suspense>
          } />
          <Route path="/admin" element={
            <React.Suspense fallback={<PageLoader />}>
              <Admin />
            </React.Suspense>
          } />
          <Route path="/docs" element={
            <React.Suspense fallback={<PageLoader />}>
              <Documentation />
            </React.Suspense>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
