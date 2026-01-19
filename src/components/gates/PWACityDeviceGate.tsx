// =============================================
// PWA City Device Gate v2.0
// Build: 2026-01-19
// Tabelas: pwacity_config
// src/components/gates/PWACityDeviceGate.tsx
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
import PWACityDesktopBlock from "./PWACityDesktopBlock";

interface PWACityDeviceGateProps {
  children: ReactNode;
}

const PWACityDeviceGate = ({ children }: PWACityDeviceGateProps) => {
  const { isMobile, isDesktop, isTablet } = useDeviceDetection();
  const { isDemoMode } = useDemoMode();
  const [allowDesktopFromConfig, setAllowDesktopFromConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Carregar config allow_desktop_access do banco (tabela pwacity_config)
  useEffect(() => {
    // Se demo mode, permitir acesso direto
    if (isDemoMode) {
      console.log("[PWACityDeviceGate] Demo mode detectado, permitindo acesso");
      setAllowDesktopFromConfig(true);
      setConfigLoaded(true);
      return;
    }

    const loadDesktopConfig = async () => {
      try {
        console.log("[PWACityDeviceGate] Carregando config do banco...");
        const { data, error } = await supabase
          .from("pwacity_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        console.log("[PWACityDeviceGate] Config response:", { data, error });

        if (!error && data?.config_value === "true") {
          console.log("[PWACityDeviceGate] ✅ allow_desktop_access = true");
          setAllowDesktopFromConfig(true);
        } else {
          console.log("[PWACityDeviceGate] ❌ allow_desktop_access = false");
          setAllowDesktopFromConfig(false);
        }
      } catch (err) {
        console.error("[PWACityDeviceGate] Erro ao carregar config:", err);
        setAllowDesktopFromConfig(false);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadDesktopConfig();
  }, [isDemoMode]);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
    console.log("[PWACityDeviceGate] iOS device detected, allowing access");
    return <>{children}</>;
  }

  // MOBILE ou TABLET: sempre permite (autenticação via PWACityAuthGate)
  if (isMobile || isTablet) {
    console.log("[PWACityDeviceGate] Mobile/Tablet access allowed");
    return <>{children}</>;
  }

  // DESKTOP: verificar toggle de configuração
  if (isDesktop) {
    // Se toggle habilitado OU demo mode, permite acesso
    if (allowDesktopFromConfig) {
      console.log("[PWACityDeviceGate] ✅ Desktop permitido (toggle habilitado)");
      return <>{children}</>;
    }

    // Toggle desabilitado - bloqueia acesso
    console.log("[PWACityDeviceGate] ❌ Desktop bloqueado (toggle desabilitado)");
    return (
      <PWACityDesktopBlock
        customMessage="O acesso desktop ao PWA City está desabilitado. Use um dispositivo móvel ou ative o toggle de desktop."
        customTitle="Desktop Desabilitado"
      />
    );
  }

  // Default: permitir
  return <>{children}</>;
};

export default PWACityDeviceGate;
