/**
 * ============================================================
 * VoiceSettings.tsx - Configurações de Voz PWA
 * ============================================================
 * Versão: 1.1.0
 * Data: 2026-01-22
 *
 * Permite ao usuário:
 * - Selecionar voz (13 vozes OpenAI)
 * - Ajustar velocidade (0.7x - 1.3x)
 * - Testar voz diretamente na seleção
 * - Aplicar presets por contexto
 *
 * v1.1.0: Botão de teste integrado na seção de detalhes da voz
 * ============================================================
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  Play,
  Square,
  Check,
  ChevronLeft,
  Gauge,
  Sparkles,
  Heart,
  Lightbulb,
  Globe,
  HelpCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

// ============================================================
// TIPOS E CONFIGURAÇÕES
// ============================================================

export type OpenAIVoice =
  | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo'
  | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer'
  | 'verse' | 'marin' | 'cedar';

interface VoiceOption {
  id: OpenAIVoice;
  name: string;
  description: string;
  characteristics: string;
  recommended?: boolean;
  gender: 'feminine' | 'masculine' | 'neutral';
}

interface VoicePreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  voice: OpenAIVoice;
  speed: number;
  description: string;
}

// Vozes disponíveis com descrições detalhadas
const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'marin',
    name: 'Marin',
    description: 'Calorosa e natural',
    characteristics: 'Tom amigável, ideal para conversas do dia a dia',
    recommended: true,
    gender: 'feminine'
  },
  {
    id: 'cedar',
    name: 'Cedar',
    description: 'Calma e reconfortante',
    characteristics: 'Transmite tranquilidade, ótima para temas de saúde',
    recommended: true,
    gender: 'masculine'
  },
  {
    id: 'nova',
    name: 'Nova',
    description: 'Enérgica e jovem',
    characteristics: 'Vibração positiva, boa para ideias e criatividade',
    gender: 'feminine'
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Sábia e educativa',
    characteristics: 'Tom professoral, excelente para informações',
    gender: 'feminine'
  },
  {
    id: 'coral',
    name: 'Coral',
    description: 'Versátil e equilibrada',
    characteristics: 'Adapta-se bem a diferentes contextos',
    gender: 'feminine'
  },
  {
    id: 'alloy',
    name: 'Alloy',
    description: 'Neutra e profissional',
    characteristics: 'Tom corporativo e objetivo',
    gender: 'neutral'
  },
  {
    id: 'ash',
    name: 'Ash',
    description: 'Suave e tranquila',
    characteristics: 'Voz serena para momentos de relaxamento',
    gender: 'masculine'
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Brilhante e alegre',
    characteristics: 'Energia positiva e entusiasta',
    gender: 'feminine'
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Neutra e clara',
    characteristics: 'Articulação precisa, fácil de entender',
    gender: 'masculine'
  },
  {
    id: 'fable',
    name: 'Fable',
    description: 'Narrativa e envolvente',
    characteristics: 'Ideal para contar histórias',
    gender: 'masculine'
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'Grave e séria',
    characteristics: 'Tom autoritário e confiável',
    gender: 'masculine'
  },
  {
    id: 'ballad',
    name: 'Ballad',
    description: 'Expressiva e musical',
    characteristics: 'Variação tonal rica e emotiva',
    gender: 'masculine'
  },
  {
    id: 'verse',
    name: 'Verse',
    description: 'Artística e criativa',
    characteristics: 'Tom único e memorável',
    gender: 'masculine'
  }
];

// Presets de voz por contexto
const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'friendly',
    name: 'Amigável',
    icon: <Sparkles className="h-4 w-4" />,
    voice: 'marin',
    speed: 1.0,
    description: 'Para conversas naturais'
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: <Heart className="h-4 w-4" />,
    voice: 'cedar',
    speed: 0.95,
    description: 'Calma e empática'
  },
  {
    id: 'ideas',
    name: 'Criativo',
    icon: <Lightbulb className="h-4 w-4" />,
    voice: 'nova',
    speed: 1.05,
    description: 'Energética e inspiradora'
  },
  {
    id: 'world',
    name: 'Informativo',
    icon: <Globe className="h-4 w-4" />,
    voice: 'sage',
    speed: 1.0,
    description: 'Educativa e clara'
  },
  {
    id: 'help',
    name: 'Assistente',
    icon: <HelpCircle className="h-4 w-4" />,
    voice: 'coral',
    speed: 1.0,
    description: 'Prestativa e paciente'
  }
];

// Chave para localStorage
const VOICE_CONFIG_KEY = 'knowyou_voice_config';

interface VoiceConfig {
  voice: OpenAIVoice;
  speed: number;
  lastUpdated: string;
}

// ============================================================
// HOOK PARA GERENCIAR CONFIGURAÇÃO DE VOZ
// ============================================================

export function useVoiceConfig() {
  const [config, setConfig] = useState<VoiceConfig>({
    voice: 'marin',
    speed: 1.0,
    lastUpdated: new Date().toISOString()
  });

  // Carregar config salva
  useEffect(() => {
    const saved = localStorage.getItem(VOICE_CONFIG_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (e) {
        console.warn('[VoiceConfig] Erro ao carregar config:', e);
      }
    }
  }, []);

  // Salvar config
  const saveConfig = (newConfig: Partial<VoiceConfig>) => {
    const updated = {
      ...config,
      ...newConfig,
      lastUpdated: new Date().toISOString()
    };
    setConfig(updated);
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(updated));
    console.log('[VoiceConfig] Configuração salva:', updated);
  };

  return { config, saveConfig };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

interface VoiceSettingsProps {
  onBack: () => void;
  onSave?: () => void;
}

export function VoiceSettings({ onBack, onSave }: VoiceSettingsProps) {
  const { config, saveConfig } = useVoiceConfig();
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>(config.voice);
  const [speed, setSpeed] = useState(config.speed);
  const [isTesting, setIsTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { speak, stop, isPlaying, isLoading } = useTextToSpeech({
    voice: selectedVoice
  });

  // Detectar mudanças
  useEffect(() => {
    const changed = selectedVoice !== config.voice || speed !== config.speed;
    setHasChanges(changed);
  }, [selectedVoice, speed, config]);

  // Testar voz
  const handleTestVoice = async () => {
    if (isPlaying || isLoading) {
      stop();
      setIsTesting(false);
      return;
    }

    setIsTesting(true);
    const testText = `Olá! Eu sou a voz ${VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name || selectedVoice}. Esta é uma demonstração de como eu soo falando em português brasileiro.`;

    try {
      await speak(testText, 'voice-test');
    } catch (e) {
      console.error('[VoiceSettings] Erro no teste:', e);
    } finally {
      setIsTesting(false);
    }
  };

  // Aplicar preset
  const handleApplyPreset = (preset: VoicePreset) => {
    setSelectedVoice(preset.voice);
    setSpeed(preset.speed);
  };

  // Salvar configurações
  const handleSave = () => {
    saveConfig({
      voice: selectedVoice,
      speed: speed
    });
    onSave?.();
    onBack();
  };

  // Formatar velocidade para exibição
  const formatSpeed = (value: number) => {
    if (value === 1.0) return 'Normal';
    if (value < 1.0) return `${((1 - value) * 100).toFixed(0)}% mais lenta`;
    return `${((value - 1) * 100).toFixed(0)}% mais rápida`;
  };

  const selectedVoiceData = VOICE_OPTIONS.find(v => v.id === selectedVoice);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Configurar Voz</h1>
          <p className="text-xs text-muted-foreground">Personalize como eu falo com você</p>
        </div>
        <Volume2 className="h-5 w-5 text-primary" />
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">

          {/* Presets Rápidos */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Presets Rápidos</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {VOICE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border transition-all",
                    selectedVoice === preset.voice && speed === preset.speed
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:border-primary/50"
                  )}
                >
                  {preset.icon}
                  <span className="text-sm font-medium whitespace-nowrap">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Seleção de Voz */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Escolha uma Voz</h2>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={cn(
                    "relative p-3 rounded-xl border text-left transition-all",
                    selectedVoice === voice.id
                      ? "bg-primary/10 border-primary ring-1 ring-primary"
                      : "bg-muted/30 border-border hover:border-primary/50"
                  )}
                >
                  {voice.recommended && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      ⭐
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{voice.name}</span>
                    {selectedVoice === voice.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{voice.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Detalhes da Voz Selecionada + Botão de Teste Integrado */}
          <AnimatePresence mode="wait">
            {selectedVoiceData && (
              <motion.section
                key={selectedVoice}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-muted/50 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Botão de Teste integrado no ícone */}
                  <button
                    onClick={handleTestVoice}
                    disabled={isLoading && !isPlaying}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      isPlaying
                        ? "bg-red-500/20 text-red-500 animate-pulse"
                        : isLoading
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/20 text-primary hover:bg-primary/30 active:scale-95"
                    )}
                  >
                    {isLoading && !isPlaying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isPlaying ? (
                      <Square className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{selectedVoiceData.name}</h3>
                      <span className="text-xs text-primary font-medium">
                        {isPlaying ? "Tocando..." : "Toque para ouvir"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedVoiceData.characteristics}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        selectedVoiceData.gender === 'feminine'
                          ? "bg-pink-500/10 text-pink-500"
                          : selectedVoiceData.gender === 'masculine'
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-gray-500/10 text-gray-500"
                      )}>
                        {selectedVoiceData.gender === 'feminine' ? 'Feminina'
                          : selectedVoiceData.gender === 'masculine' ? 'Masculina'
                          : 'Neutra'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Controle de Velocidade */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Velocidade
              </h2>
              <span className="text-sm font-medium">{formatSpeed(speed)}</span>
            </div>

            <div className="space-y-3">
              <Slider
                value={[speed]}
                onValueChange={([value]) => setSpeed(value)}
                min={0.7}
                max={1.3}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mais lenta</span>
                <span>Normal</span>
                <span>Mais rápida</span>
              </div>
            </div>
          </section>

          {/* Info sobre humanização */}
          <section className="bg-blue-500/10 rounded-xl p-4 text-sm">
            <p className="text-blue-500 font-medium mb-1">💡 Dica de Humanização</p>
            <p className="text-muted-foreground">
              Usamos o modelo <code className="bg-muted px-1 rounded">gpt-4o-mini-tts</code> com instruções
              especiais para criar uma voz mais natural. Cada módulo (Saúde, Ideias, etc.) usa
              configurações específicas de tom e emoção.
            </p>
          </section>

        </div>
      </div>

      {/* Footer - Salvar */}
      <div className="p-4 border-t border-border bg-background">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="w-full h-12"
        >
          {hasChanges ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          ) : (
            'Nenhuma alteração'
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export default VoiceSettings;
