import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PWAConfig {
  welcomeText: string;
  ttsVoice: string;
  micTimeoutSeconds: number;
  enableCountdown: boolean;
  splashDurationMs: number;
}

const DEFAULT_CONFIG: PWAConfig = {
  welcomeText: "Olá [name]! Bem-vindo ao KnowYOU, seu assistente de voz inteligente. Escolha um dos módulos abaixo para começarmos.",
  ttsVoice: "fernando",
  micTimeoutSeconds: 10,
  enableCountdown: true,
  splashDurationMs: 3000,
};

const CONFIG_KEY_MAP: Record<keyof PWAConfig, string> = {
  welcomeText: "welcome_text",
  ttsVoice: "tts_voice",
  micTimeoutSeconds: "mic_timeout_seconds",
  enableCountdown: "enable_countdown",
  splashDurationMs: "splash_duration_ms",
};

interface UseConfigPWAReturn {
  config: PWAConfig;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateConfig: (key: keyof PWAConfig, value: string | number | boolean) => void;
  saveConfig: () => Promise<boolean>;
  resetToDefaults: () => void;
  refetch: () => Promise<void>;
}

export function useConfigPWA(): UseConfigPWAReturn {
  const [config, setConfig] = useState<PWAConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("pwa_config")
        .select("config_key, config_value, config_type");

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const newConfig = { ...DEFAULT_CONFIG };
        
        data.forEach((row) => {
          const key = Object.entries(CONFIG_KEY_MAP).find(
            ([, dbKey]) => dbKey === row.config_key
          )?.[0] as keyof PWAConfig | undefined;

          if (key && row.config_value !== null) {
            if (row.config_type === "number") {
              (newConfig as Record<string, unknown>)[key] = parseInt(row.config_value, 10);
            } else if (row.config_type === "boolean") {
              (newConfig as Record<string, unknown>)[key] = row.config_value === "true";
            } else {
              (newConfig as Record<string, unknown>)[key] = row.config_value;
            }
          }
        });

        setConfig(newConfig);
      }
    } catch (err) {
      console.error("Erro ao carregar config PWA:", err);
      setError("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback((key: keyof PWAConfig, value: string | number | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const updates = Object.entries(config).map(([key, value]) => {
        const dbKey = CONFIG_KEY_MAP[key as keyof PWAConfig];
        return {
          config_key: dbKey,
          config_value: String(value),
        };
      });

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("pwa_config")
          .update({
            config_value: update.config_value,
            updated_at: new Date().toISOString(),
          })
          .eq("config_key", update.config_key);

        if (updateError) throw updateError;
      }

      toast.success("Configurações salvas com sucesso!");
      return true;
    } catch (err) {
      console.error("Erro ao salvar config PWA:", err);
      setError("Erro ao salvar configurações");
      toast.error("Erro ao salvar configurações");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    toast.info("Configurações restauradas para o padrão (salve para aplicar)");
  }, []);

  return {
    config,
    isLoading,
    isSaving,
    error,
    updateConfig,
    saveConfig,
    resetToDefaults,
    refetch: fetchConfig,
  };
}

export default useConfigPWA;
