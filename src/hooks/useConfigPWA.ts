/**
 * useConfigPWA - Hook para configurações do PWA
 *
 * v2.0.0 - Simplificado após remoção da tabela pwa_config
 * Retorna valores padrão hardcoded
 */

import { useMemo } from "react";

export interface PWAConfig {
  welcomeText: string;
  splashDurationMs: number;
  autoplayEnabled: boolean;
  voiceModel: string;
  voiceSpeed: number;
  voicePitch: number;
}

const DEFAULT_CONFIG: PWAConfig = {
  welcomeText: "Olá! Eu sou o IconsAI, seu assistente de voz. Escolha um módulo abaixo para começar.",
  splashDurationMs: 2500,
  autoplayEnabled: false,
  voiceModel: "eleven_multilingual_v2",
  voiceSpeed: 1.0,
  voicePitch: 1.0,
};

export function useConfigPWA() {
  const config = useMemo(() => DEFAULT_CONFIG, []);

  return {
    config,
    isLoading: false,
    error: null,
  };
}

export default useConfigPWA;
