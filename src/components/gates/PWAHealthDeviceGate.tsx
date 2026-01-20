// =============================================
// PWA Health Device Gate v2.0
// Build: 2026-01-19
// Tabelas: pwahealth_config
// src/components/gates/PWAHealthDeviceGate.tsx
// Demo Mode Support
//
// REGRAS:
// - Mobile/Tablet: sempre permite
// - iOS: sempre permite
// - Desktop:
//   - Demo Mode: sempre permite (bypass total)
//   - Toggle allow_desktop_access = true: permite TODOS
//   - Toggle false: bloqueia todos
// =============================================

import { ReactNode, useState, useEffect } from "react";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import PWAHealthDesktopBlock from "./PWAHealthDesktopBlock";

interface PWAHealthDeviceGateProps {
  children: ReactNode;
}

const PWAHealthDeviceGate = ({ children }: PWAHealthDeviceGateProps) => {
  const { isMobile, isDesktop, isTablet } = useDeviceDetection();
  const { isDemoMode } = useDemoMode();
  const [allowDesktopFromConfig, setAllowDesktopFromConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Carregar config allow_desktop_access do banco (tabela pwahealth_config)
  useEffect(() => {
    // Se demo mode, permitir acesso direto
    if (isDemoMode) {
      console.log("[PWAHealthDeviceGate] Demo mode detectado, permitindo acesso");
      setAllowDesktopFromConfig(true);
      setConfigLoaded(true);
      return;
    }

    const loadDesktopConfig = async () => {
      try {
        console.log("[PWAHealthDeviceGate] Carregando config do banco...");
        const { data, error } = await supabase
          .from("pwahealth_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        console.log("[PWAHealthDeviceGate] Config response:", { data, error });

        if (error) {
          // Se tabela não existe, permitir por padrão
          console.log("[PWAHealthDeviceGate] Config não encontrada, permitindo por padrão");
          setAllowDesktopFromConfig(true);
        } else if (data?.config_value === "true") {
          console.log("[PWAHealthDeviceGate] ✅ allow_desktop_access = true");
          setAllowDesktopFromConfig(true);
        } else {
          console.log("[PWAHealthDeviceGate] ❌ allow_desktop_access = false");
          setAllowDesktopFromConfig(false);
        }
      } catch (err) {
        console.error("[PWAHealthDeviceGate] Erro ao carregar config:", err);
        // Se tabela não existe, permitir por padrão
        setAllowDesktopFromConfig(true);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadDesktopConfig();
  }, [isDemoMode]);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Aguardar config carregar
  if (!configLoaded) {
    return <LoadingSpinner />;
  }

  // Verificar se é dispositivo iOS (sempre permite, independente de desktop/mobile)
  const isIOSDevice =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOSDevice) {
    console.log("[PWAHealthDeviceGate] iOS device detected, allowing access");
    return <>{children}</>;
  }

  // MOBILE ou TABLET: sempre permite (autenticação via PWAHealthAuthGate)
  if (isMobile || isTablet) {
    console.log("[PWAHealthDeviceGate] Mobile/Tablet access allowed");
    return <>{children}</>;
  }

  // DESKTOP: verificar toggle de configuração
  if (isDesktop) {
    // Se toggle habilitado OU demo mode, permite acesso
    if (allowDesktopFromConfig) {
      console.log("[PWAHealthDeviceGate] ✅ Desktop permitido (toggle habilitado)");
      return <>{children}</>;
    }

    // Toggle desabilitado - bloqueia acesso
    console.log("[PWAHealthDeviceGate] ❌ Desktop bloqueado (toggle desabilitado)");
    return (
      <PWAHealthDesktopBlock
        customMessage="O acesso desktop ao PWA Health está desabilitado. Use um dispositivo móvel ou ative o toggle de desktop."
        customTitle="Desktop Desabilitado"
      />
    );
  }

  // Default: permitir
  return <>{children}</>;
};

export default PWAHealthDeviceGate;
