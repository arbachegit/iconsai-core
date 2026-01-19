import { useState, useEffect } from "react";

export type DemoType = "clean" | "seeded" | null;

export interface DemoModeState {
  isDemoMode: boolean;
  demoType: DemoType;
}

/**
 * Hook para detectar se a aplicação está em modo demonstração
 * Verifica os query params ?demo=clean, ?demo=seeded ou ?demo=true
 */
export function useDemoMode(): DemoModeState {
  // Detectar IMEDIATAMENTE, sem esperar useEffect
  const params = new URLSearchParams(window.location.search);
  const demoParam = params.get("demo");
  const storedDemo = sessionStorage.getItem("pwa-demo-mode");

  // Aceitar "true" como equivalente a "clean"
  const normalizedDemo = demoParam === "true" ? "clean" : demoParam;
  const normalizedStored = storedDemo === "true" ? "clean" : storedDemo;

  const initialDemoMode =
    (normalizedDemo === "clean" || normalizedDemo === "seeded") ? normalizedDemo :
    (normalizedStored === "clean" || normalizedStored === "seeded") ? normalizedStored :
    null;

  const [demoMode, setDemoMode] = useState<DemoModeState>({
    isDemoMode: !!initialDemoMode,
    demoType: initialDemoMode,
  });

  useEffect(() => {
    // Verificar URL params
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get("demo");

    console.log("[useDemoMode] URL:", window.location.href);
    console.log("[useDemoMode] Param demo:", demoParam);

    // Aceitar "true" como equivalente a "clean"
    const normalizedParam = demoParam === "true" ? "clean" : demoParam;

    if (normalizedParam === "clean" || normalizedParam === "seeded") {
      console.log(`[useDemoMode] ✅ DEMO MODE ATIVADO: ${normalizedParam}`);

      setDemoMode({
        isDemoMode: true,
        demoType: normalizedParam,
      });

      // Salvar em sessionStorage
      sessionStorage.setItem("pwa-demo-mode", normalizedParam);
    } else {
      // Verificar sessionStorage
      const storedDemo = sessionStorage.getItem("pwa-demo-mode");
      const normalizedStored = storedDemo === "true" ? "clean" : storedDemo;
      console.log("[useDemoMode] SessionStorage:", storedDemo);

      if (normalizedStored === "clean" || normalizedStored === "seeded") {
        console.log(`[useDemoMode] ✅ DEMO MODE (from session): ${normalizedStored}`);
        setDemoMode({
          isDemoMode: true,
          demoType: normalizedStored,
        });
      } else {
        console.log("[useDemoMode] ❌ Modo normal (sem demo)");
      }
    }
  }, []);

  console.log("[useDemoMode] Retornando:", demoMode);
  return demoMode;
}
