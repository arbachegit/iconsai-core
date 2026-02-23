/**
 * useAdminSettings - Hook para configurações de admin
 *
 * v2.0.0 - Simplificado (tabela admin_settings removida)
 */

import { useMemo } from "react";

export interface AdminSettings {
  chatAudioEnabled: boolean;
  autoPlayAudio: boolean;
  gmailApiConfigured: boolean;
  dailyReportEnabled: boolean;
}

const DEFAULT_SETTINGS: AdminSettings = {
  chatAudioEnabled: true,
  autoPlayAudio: false,
  gmailApiConfigured: false,
  dailyReportEnabled: false,
};

export function useAdminSettings() {
  const settings = useMemo(() => DEFAULT_SETTINGS, []);

  return {
    settings,
    isLoading: false,
    error: null,
  };
}

export default useAdminSettings;
