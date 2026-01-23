/**
 * ============================================================
 * AgentVoiceConfig.tsx - Configuração de Voz por Agente/Módulo
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Funcionalidades:
 * - Configuração de voz por módulo (economia, health, ideias)
 * - Sliders de humanização independentes por módulo
 * - Instructions customizadas por módulo
 * - Teste de voz por módulo
 * ============================================================
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Home,
  Heart,
  Lightbulb,
  Globe,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  Save,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { VoiceSelector } from './VoiceSelector';
import { HumanizationSliders, type HumanizationValues } from './HumanizationSliders';
import { InstructionsEditor } from './InstructionsEditor';
import { TestVoiceButton } from './TestVoiceButton';
import {
  DEFAULT_HUMANIZATION_VALUES,
  DEFAULT_TOGGLE_VALUES,
  MODULE_DEFAULT_VOICES,
  AVAILABLE_MODULES,
} from './voice-constants';

export interface AgentVoiceSettings {
  moduleId: string;
  voice: string;
  humanization: HumanizationValues;
  instructions: string;
  isCustom: boolean;
}

interface AgentVoiceConfigProps {
  configs: AgentVoiceSettings[];
  onConfigsChange: (configs: AgentVoiceSettings[]) => void;
  disabled?: boolean;
}

// Configurações padrão por módulo
const DEFAULT_AGENT_CONFIGS: AgentVoiceSettings[] = AVAILABLE_MODULES.map((module) => ({
  moduleId: module.id,
  voice: MODULE_DEFAULT_VOICES[module.id] || 'nova',
  humanization: {
    ...DEFAULT_HUMANIZATION_VALUES,
    ...DEFAULT_TOGGLE_VALUES,
  },
  instructions: '',
  isCustom: false,
}));

// Ícones por módulo
const MODULE_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="h-4 w-4" />,
  health: <Heart className="h-4 w-4" />,
  ideas: <Lightbulb className="h-4 w-4" />,
  world: <Globe className="h-4 w-4" />,
  help: <HelpCircle className="h-4 w-4" />,
};

// Cores por módulo
const MODULE_COLORS: Record<string, string> = {
  home: '#00D4FF',
  health: '#FF6B6B',
  ideas: '#F59E0B',
  world: '#10B981',
  help: '#6366F1',
};

export const AgentVoiceConfig: React.FC<AgentVoiceConfigProps> = ({
  configs,
  onConfigsChange,
  disabled = false,
}) => {
  const [activeModule, setActiveModule] = useState('home');
  const [expandedSection, setExpandedSection] = useState<string | null>('voice');

  const updateConfig = (moduleId: string, updates: Partial<AgentVoiceSettings>) => {
    const updated = configs.map((c) =>
      c.moduleId === moduleId ? { ...c, ...updates, isCustom: true } : c
    );
    onConfigsChange(updated);
  };

  const resetConfig = (moduleId: string) => {
    const defaultConfig = DEFAULT_AGENT_CONFIGS.find((c) => c.moduleId === moduleId);
    if (defaultConfig) {
      const updated = configs.map((c) =>
        c.moduleId === moduleId ? { ...defaultConfig } : c
      );
      onConfigsChange(updated);
      toast.success(`Configuração do módulo restaurada ao padrão`);
    }
  };

  const copyConfigToOthers = (sourceModuleId: string) => {
    const sourceConfig = configs.find((c) => c.moduleId === sourceModuleId);
    if (sourceConfig) {
      const updated = configs.map((c) =>
        c.moduleId === sourceModuleId
          ? c
          : {
              ...c,
              humanization: { ...sourceConfig.humanization },
              instructions: sourceConfig.instructions,
              isCustom: true,
            }
      );
      onConfigsChange(updated);
      toast.success('Configurações copiadas para todos os módulos');
    }
  };

  const activeConfig = configs.find((c) => c.moduleId === activeModule) || configs[0];
  const moduleInfo = AVAILABLE_MODULES.find((m) => m.id === activeModule);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-500" />
          Configuração de Voz por Módulo
        </CardTitle>
        <CardDescription className="text-xs">
          Configure voz e humanização específica para cada módulo do PWA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs de Módulos */}
        <Tabs value={activeModule} onValueChange={setActiveModule}>
          <TabsList className="grid grid-cols-5 w-full">
            {AVAILABLE_MODULES.map((module) => {
              const config = configs.find((c) => c.moduleId === module.id);
              return (
                <TabsTrigger
                  key={module.id}
                  value={module.id}
                  className="flex items-center gap-1 text-xs"
                >
                  <span style={{ color: module.color }}>{MODULE_ICONS[module.id]}</span>
                  <span className="hidden sm:inline">{module.name}</span>
                  {config?.isCustom && (
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Customizado" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {AVAILABLE_MODULES.map((module) => {
            const config = configs.find((c) => c.moduleId === module.id);
            if (!config) return null;

            return (
              <TabsContent key={module.id} value={module.id} className="mt-4 space-y-4">
                {/* Header do módulo */}
                <div
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{
                    borderColor: `${module.color}40`,
                    backgroundColor: `${module.color}10`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${module.color}30` }}
                    >
                      <div style={{ color: module.color }}>{MODULE_ICONS[module.id]}</div>
                    </div>
                    <div>
                      <h4 className="font-medium">{module.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Voz atual: <span className="font-mono">{config.voice}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.isCustom && (
                      <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                        Customizado
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyConfigToOthers(module.id)}
                      title="Copiar para outros módulos"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Seção: Voz */}
                <Collapsible
                  open={expandedSection === 'voice'}
                  onOpenChange={(open) => setExpandedSection(open ? 'voice' : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <span className="font-medium text-sm">Seleção de Voz</span>
                      {expandedSection === 'voice' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-4 p-4 border rounded-lg bg-card">
                      <VoiceSelector
                        value={config.voice}
                        onValueChange={(voice) => updateConfig(module.id, { voice })}
                        disabled={disabled}
                      />
                      <TestVoiceButton
                        voice={config.voice}
                        humanization={config.humanization}
                        moduleType={module.id}
                        testText={`Olá! Esta é a voz configurada para o módulo ${module.name} do IconsAI Business.`}
                        variant="outline"
                        className="w-full"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Seção: Humanização */}
                <Collapsible
                  open={expandedSection === 'humanization'}
                  onOpenChange={(open) => setExpandedSection(open ? 'humanization' : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <span className="font-medium text-sm">Parâmetros de Humanização</span>
                      {expandedSection === 'humanization' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <HumanizationSliders
                      values={config.humanization}
                      onChange={(humanization) => updateConfig(module.id, { humanization })}
                      disabled={disabled}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Seção: Instructions */}
                <Collapsible
                  open={expandedSection === 'instructions'}
                  onOpenChange={(open) => setExpandedSection(open ? 'instructions' : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <span className="font-medium text-sm">Instructions Customizadas</span>
                      {expandedSection === 'instructions' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <InstructionsEditor
                      value={config.instructions}
                      onChange={(instructions) => updateConfig(module.id, { instructions })}
                      moduleType={module.id}
                      disabled={disabled}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Ações */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetConfig(module.id)}
                    disabled={disabled || !config.isCustom}
                  >
                    Restaurar Padrão
                  </Button>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export { DEFAULT_AGENT_CONFIGS };
export default AgentVoiceConfig;
