import React, { Suspense, lazy, useEffect, useState } from "react";
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
import { ThemeProvider } from "./contexts/ThemeContext";
import { BannedScreen } from "./components/BannedScreen";
import { DeviceGate } from "./components/gates";
import { initSecurityShield, checkBanStatus, getDeviceFingerprint } from "./lib/security-shield";

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
const PWA = lazy(() => import("./pages/PWA"));
const PWAMultiAgent = lazy(() => import("./pages/PWAMultiAgent"));
const PWARegister = lazy(() => import("./pages/PWARegister"));
const PWAVoiceAssistant = lazy(() => import("./components/pwa/voice/PWAVoiceAssistant"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const Contact = lazy(() => import("./pages/Contact"));
const TestRetailDiagram = lazy(() => import("./pages/TestRetailDiagram"));

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

// Security wrapper component
interface BanInfo {
  reason: string;
  deviceId: string;
  bannedAt?: string;
}

const SecurityWrapper = ({ children }: { children: React.ReactNode }) => {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const cleanupRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Initialize security shield (now async)
    const initShield = async () => {
      const cleanup = await initSecurityShield();
      if (isMounted) {
        cleanupRef.current = cleanup;
      }
    };
    initShield();

    // Check ban status on load
    const checkBan = async () => {
      try {
        const status = await checkBanStatus();
        if (status.isBanned && isMounted) {
          setBanInfo({
            reason: status.reason || status.violationType || "Violação de segurança",
            deviceId: status.deviceId || getDeviceFingerprint().substring(0, 16),
            bannedAt: status.bannedAt,
          });
        }
      } catch (error) {
        console.error("Error checking ban status:", error);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkBan();

    // Listen for security ban events from the shield
    const handleBanned = (event: CustomEvent<{ reason: string; deviceId: string }>) => {
      setBanInfo({
        reason: event.detail.reason,
        deviceId: event.detail.deviceId,
      });
    };

    window.addEventListener("security-banned", handleBanned as EventListener);

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      window.removeEventListener("security-banned", handleBanned as EventListener);
    };
  }, []);

  // Show loading while checking ban status
  if (isChecking) {
    return <PageLoader />;
  }

  // Show ban screen if banned
  if (banInfo) {
    return (
      <BannedScreen
        reason={banInfo.reason}
        deviceId={banInfo.deviceId}
        bannedAt={banInfo.bannedAt}
      />
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AudioPlayerProvider>
        <TooltipProvider>
          <SecurityWrapper>
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
                    
                    {/* Protected Routes - Desktop Only */}
                    <Route path="/hub" element={
                      <DeviceGate allowMobile={false}>
                        <ProtectedRoute requiredRole="superadmin">
                          <Hub />
                        </ProtectedRoute>
                      </DeviceGate>
                    } />
                    <Route path="/app" element={
                      <DeviceGate mobileShowChat={true}>
                        <ProtectedRoute>
                          <AppPage />
                        </ProtectedRoute>
                      </DeviceGate>
                    } />
                    <Route path="/dashboard" element={
                      <DeviceGate mobileShowChat={true}>
                        <ProtectedRoute requiredRole="admin">
                          <DashboardAdmin />
                        </ProtectedRoute>
                      </DeviceGate>
                    } />
                    <Route path="/admin/dashboard" element={
                      <DeviceGate allowMobile={false}>
                        <ProtectedRoute requiredRole="admin">
                          <Dashboard />
                        </ProtectedRoute>
                      </DeviceGate>
                    } />
                    <Route path="/admin" element={
                      <DeviceGate allowMobile={false}>
                        <ProtectedRoute requiredRole="superadmin">
                          <Admin />
                        </ProtectedRoute>
                      </DeviceGate>
                    } />
                    
                    {/* Public Routes */}
                    <Route path="/docs" element={<Documentation />} />
                    <Route path="/arquitetura" element={<Arquitetura />} />
                    <Route path="/contact" element={<Contact />} />
                    
                    {/* PWA Routes - Mobile Only */}
                    <Route path="/pwa" element={
                      <DeviceGate allowDesktop={false}>
                        <PWAMultiAgent />
                      </DeviceGate>
                    } />
                    <Route path="/pwa-legacy" element={
                      <DeviceGate allowDesktop={false}>
                        <PWA />
                      </DeviceGate>
                    } />
                    <Route path="/pwa-register" element={
                      <DeviceGate allowDesktop={false}>
                        <PWARegister />
                      </DeviceGate>
                    } />
                    <Route path="/pwa-knowyou" element={
                      <DeviceGate allowDesktop={false}>
                        <PWAVoiceAssistant />
                      </DeviceGate>
                    } />
                    
                    <Route path="/invite/:token" element={<InvitePage />} />
                    
                    {/* Temporary test route */}
                    <Route path="/test/retail-diagram" element={<TestRetailDiagram />} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              {/* Global Floating Audio Player */}
              <FloatingAudioPlayer />
            </ApiRegistrySyncProvider>
          </SecurityWrapper>
        </TooltipProvider>
      </AudioPlayerProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
