// Build: 2026-02-03-SIMPLIFIED - Desktop focused, no device gates
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { FloatingAudioPlayer } from "./components/FloatingAudioPlayer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

// Lazy load pages
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminSignup = lazy(() => import("./pages/AdminSignup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardAdmin = lazy(() => import("./pages/DashboardAdmin"));
const Hub = lazy(() => import("./pages/Hub"));
const Admin = lazy(() => import("./pages/Admin"));
const VoiceAssistantPage = lazy(() => import("./components/voice-assistant/VoiceAssistantPage"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AudioPlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Redirect "/" to login */}
                <Route path="/" element={<Navigate to="/admin/login" replace />} />

                {/* Auth Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/signup" element={<AdminSignup />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Protected Routes */}
                <Route path="/hub" element={
                  <ProtectedRoute requiredRole="superadmin">
                    <Hub />
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

                {/* Voice Assistant */}
                <Route path="/voice-assistant" element={
                  <ProtectedRoute>
                    <VoiceAssistantPage />
                  </ProtectedRoute>
                } />
                <Route path="/pwa" element={
                  <ProtectedRoute>
                    <VoiceAssistantPage />
                  </ProtectedRoute>
                } />

                {/* Public Routes */}
                <Route path="/docs" element={<Documentation />} />

                {/* Invite Routes */}
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="/accept-invite/:token" element={<InviteAcceptPage />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <FloatingAudioPlayer />
        </TooltipProvider>
      </AudioPlayerProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
