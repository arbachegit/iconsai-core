/**
 * ============================================================
 * VoiceHumanizationPanel.tsx - Painel Principal de Humanização de Voz
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Painel administrativo completo para configuração de humanização
 * de voz do IconsAI Business.
 *
 * Componentes:
 * - VoiceSelector: Dropdown com 13 vozes OpenAI
 * - HumanizationSliders: 5 sliders + 3 toggles
 * - WelcomePresetsEditor: 4 presets com chevron
 * - AgentVoiceConfig: Config por módulo/agente
 * - InstructionsEditor: Textarea editável
 * - TestVoiceButton: Botão play/stop
 * - VoiceComparisonTable: tts-1 vs gpt-4o-mini-tts
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Volume2,
  Sliders,
  FileText,
  Users,
  Info,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Componentes internos
import { VoiceSelector } from './VoiceSelector';
import { HumanizationSliders, type HumanizationValues } from './HumanizationSliders';
import { InstructionsEditor } from './InstructionsEditor';
import { WelcomePresetsEditor, DEFAULT_WELCOME_PRESETS, type WelcomePreset } from './WelcomePresetsEditor';
import { AgentVoiceConfig, DEFAULT_AGENT_CONFIGS, type AgentVoiceSettings } from './AgentVoiceConfig';
import { TestVoiceButton } from './TestVoiceButton';
import { VoiceComparisonTable } from './VoiceComparisonTable';
import {
  DEFAULT_HUMANIZATION_VALUES,
  DEFAULT_TOGGLE_VALUES,
  MODULE_DEFAULT_VOICES,
} from './voice-constants';

// Estado global do painel
interface VoiceHumanizationState {
  // Configuração global (default)
  globalVoice: string;
  globalHumanization: HumanizationValues;
  globalInstructions: string;

  // Presets de boas-vindas
  welcomePresets: WelcomePreset[];

  // Configurações por módulo
  agentConfigs: AgentVoiceSettings[];

  // Metadados
  lastSaved: string | null;
  isDirty: boolean;
}

const DEFAULT_STATE: VoiceHumanizationState = {
  globalVoice: 'nova',
  globalHumanization: {
    ...DEFAULT_HUMANIZATION_VALUES,
    ...DEFAULT_TOGGLE_VALUES,
  },
  globalInstructions: '',
  welcomePresets: DEFAULT_WELCOME_PRESETS,
  agentConfigs: DEFAULT_AGENT_CONFIGS,
  lastSaved: null,
  isDirty: false,
};

export const VoiceHumanizationPanel: React.FC = () => {
  const [state, setState] = useState<VoiceHumanizationState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('global');

  // Carregar configurações do banco
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // Carregar configuração global de voz
      const { data: voiceConfig } = await supabase
        .from('pwa_config')
        .select('config_key, config_value')
        .in('config_key', [
          'voice_humanization_config',
          'welcome_presets',
          'agent_voice_configs',
        ]);

      if (voiceConfig) {
        const configMap = Object.fromEntries(
          voiceConfig.map((c) => [c.config_key, c.config_value])
        );

        // Aplicar configurações carregadas
        if (configMap.voice_humanization_config) {
          try {
            const parsed = JSON.parse(configMap.voice_humanization_config);
            setState((prev) => ({
              ...prev,
              globalVoice: parsed.globalVoice || prev.globalVoice,
              globalHumanization: parsed.globalHumanization || prev.globalHumanization,
              globalInstructions: parsed.globalInstructions || prev.globalInstructions,
              lastSaved: parsed.lastSaved || null,
            }));
          } catch (e) {
            console.warn('Erro ao parsear voice_humanization_config:', e);
          }
        }

        if (configMap.welcome_presets) {
          try {
            const parsed = JSON.parse(configMap.welcome_presets);
            if (Array.isArray(parsed)) {
              setState((prev) => ({ ...prev, welcomePresets: parsed }));
            }
          } catch (e) {
            console.warn('Erro ao parsear welcome_presets:', e);
          }
        }

        if (configMap.agent_voice_configs) {
          try {
            const parsed = JSON.parse(configMap.agent_voice_configs);
            if (Array.isArray(parsed)) {
              setState((prev) => ({ ...prev, agentConfigs: parsed }));
            }
          } catch (e) {
            console.warn('Erro ao parsear agent_voice_configs:', e);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações de voz');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      // Preparar dados para salvar
      const voiceHumanizationConfig = JSON.stringify({
        globalVoice: state.globalVoice,
        globalHumanization: state.globalHumanization,
        globalInstructions: state.globalInstructions,
        lastSaved: now,
      });

      const welcomePresets = JSON.stringify(state.welcomePresets);
      const agentVoiceConfigs = JSON.stringify(state.agentConfigs);

      // Upsert todas as configurações
      const configs = [
        { config_key: 'voice_humanization_config', config_value: voiceHumanizationConfig },
        { config_key: 'welcome_presets', config_value: welcomePresets },
        { config_key: 'agent_voice_configs', config_value: agentVoiceConfigs },
      ];

      for (const config of configs) {
        const { error } = await supabase.from('pwa_config').upsert(
          {
            config_key: config.config_key,
            config_value: config.config_value,
            config_type: 'json',
            updated_at: now,
          },
          { onConflict: 'config_key' }
        );

        if (error) throw error;
      }

      setState((prev) => ({ ...prev, lastSaved: now, isDirty: false }));
      toast.success('Configurações de voz salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setState({
      ...DEFAULT_STATE,
      isDirty: true,
    });
    toast.success('Configurações restauradas ao padrão');
  };

  const updateState = <K extends keyof VoiceHumanizationState>(
    key: K,
    value: VoiceHumanizationState[K]
  ) => {
    setState((prev) => ({ ...prev, [key]: value, isDirty: true }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Humanização de Voz
            </h2>
            <p className="text-muted-foreground text-sm">
              Configure a voz do IconsAI Business para soar natural e acolhedora
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.isDirty && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              Alterações não salvas
            </Badge>
          )}
          {state.lastSaved && (
            <Badge variant="secondary" className="text-xs">
              Salvo: {new Date(state.lastSaved).toLocaleString('pt-BR')}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="global" className="flex items-center gap-1">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Global</span>
          </TabsTrigger>
          <TabsTrigger value="humanization" className="flex items-center gap-1">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Humanização</span>
          </TabsTrigger>
          <TabsTrigger value="presets" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Presets</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Comparação</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuração Global */}
        <TabsContent value="global" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-cyan-500" />
                Voz Global Padrão
              </CardTitle>
              <CardDescription>
                Voz utilizada quando não há configuração específica por módulo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <VoiceSelector
                value={state.globalVoice}
                onValueChange={(voice) => updateState('globalVoice', voice)}
              />

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Testar Voz Global</h4>
                <TestVoiceButton
                  voice={state.globalVoice}
                  humanization={state.globalHumanization}
                  moduleType="default"
                  testText="Olá! Esta é a voz global configurada para o IconsAI Business. Estou usando as configurações de humanização definidas no painel administrativo."
                  variant="default"
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          <InstructionsEditor
            value={state.globalInstructions}
            onChange={(instructions) => updateState('globalInstructions', instructions)}
            moduleType="default"
          />
        </TabsContent>

        {/* Tab: Humanização */}
        <TabsContent value="humanization" className="space-y-6 mt-6">
          <HumanizationSliders
            values={state.globalHumanization}
            onChange={(humanization) => updateState('globalHumanization', humanization)}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h4 className="font-medium">Testar Configurações de Humanização</h4>
                <p className="text-sm text-muted-foreground">
                  Ouça como as configurações afetam a voz
                </p>
                <TestVoiceButton
                  voice={state.globalVoice}
                  humanization={state.globalHumanization}
                  testText="Com estas configurações de humanização, minha voz soa mais natural e acolhedora. Perceba como o tom, ritmo e expressividade fazem diferença na experiência do usuário."
                  variant="default"
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Presets de Boas-vindas */}
        <TabsContent value="presets" className="space-y-6 mt-6">
          <WelcomePresetsEditor
            presets={state.welcomePresets}
            onPresetsChange={(presets) => updateState('welcomePresets', presets)}
          />
        </TabsContent>

        {/* Tab: Configuração por Módulo */}
        <TabsContent value="agents" className="space-y-6 mt-6">
          <AgentVoiceConfig
            configs={state.agentConfigs}
            onConfigsChange={(configs) => updateState('agentConfigs', configs)}
          />
        </TabsContent>

        {/* Tab: Comparação de Modelos */}
        <TabsContent value="comparison" className="space-y-6 mt-6">
          <VoiceComparisonTable />
        </TabsContent>
      </Tabs>

      {/* Ações */}
      <Card className="sticky bottom-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {state.isDirty ? (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  Alterações não salvas
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-500 border-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Salvo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Padrões
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restaurar Configurações Padrão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá restaurar todas as configurações de voz para os valores
                      padrão. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={resetToDefaults}>
                      Restaurar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={saveConfig} disabled={isSaving || !state.isDirty}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceHumanizationPanel;
