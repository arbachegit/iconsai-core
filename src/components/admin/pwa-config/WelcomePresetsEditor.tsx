/**
 * ============================================================
 * WelcomePresetsEditor.tsx - Editor de Presets de Boas-vindas
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Funcionalidades:
 * - 4 presets de boas-vindas com chevron expansível
 * - Edição inline do texto
 * - Preview com nome do usuário
 * - Voz específica por preset
 * ============================================================
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Save,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { VoiceSelector } from './VoiceSelector';
import { TestVoiceButton } from './TestVoiceButton';
import type { HumanizationValues } from './HumanizationSliders';
import { MODULE_DEFAULT_VOICES, DEFAULT_HUMANIZATION_VALUES, DEFAULT_TOGGLE_VALUES } from './voice-constants';

export interface WelcomePreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  text: string;
  voice: string;
}

interface WelcomePresetsEditorProps {
  presets: WelcomePreset[];
  onPresetsChange: (presets: WelcomePreset[]) => void;
  disabled?: boolean;
}

// Presets padrão
export const DEFAULT_WELCOME_PRESETS: WelcomePreset[] = [
  {
    id: 'home',
    name: 'Home',
    icon: <Home className="h-4 w-4" />,
    color: '#00D4FF',
    text: 'Olá, [name]! Eu sou o IconsAI Business, seu assistente de voz desenvolvido pela Arbache AI. Escolha um módulo abaixo para começar.',
    voice: 'nova',
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: <Heart className="h-4 w-4" />,
    color: '#FF6B6B',
    text: 'Olá, [name]. Seja bem-vindo ao módulo de Saúde do IconsAI. Estou aqui para ajudar você a cuidar do seu bem-estar. O que posso fazer por você hoje?',
    voice: 'shimmer',
  },
  {
    id: 'ideas',
    name: 'Ideias',
    icon: <Lightbulb className="h-4 w-4" />,
    color: '#F59E0B',
    text: 'Olá, [name]! Que bom ter você no módulo de Ideias! Vamos explorar possibilidades juntos? Conte-me sobre o que você está pensando!',
    voice: 'coral',
  },
  {
    id: 'world',
    name: 'Mundo',
    icon: <Globe className="h-4 w-4" />,
    color: '#10B981',
    text: 'Olá, [name]. Bem-vindo ao módulo Mundo do IconsAI. Aqui você pode explorar conhecimentos, notícias e descobertas. Sobre o que gostaria de saber?',
    voice: 'sage',
  },
  {
    id: 'help',
    name: 'Ajuda',
    icon: <HelpCircle className="h-4 w-4" />,
    color: '#6366F1',
    text: 'Olá, [name]! Estou aqui para ajudar você com qualquer dúvida sobre o IconsAI. Pode perguntar à vontade!',
    voice: 'echo',
  },
];

export const WelcomePresetsEditor: React.FC<WelcomePresetsEditorProps> = ({
  presets,
  onPresetsChange,
  disabled = false,
}) => {
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  const updatePreset = (id: string, updates: Partial<WelcomePreset>) => {
    const updated = presets.map((p) => (p.id === id ? { ...p, ...updates } : p));
    onPresetsChange(updated);
  };

  const resetPreset = (id: string) => {
    const defaultPreset = DEFAULT_WELCOME_PRESETS.find((p) => p.id === id);
    if (defaultPreset) {
      updatePreset(id, { text: defaultPreset.text, voice: defaultPreset.voice });
      toast.success(`Preset "${defaultPreset.name}" restaurado ao padrão`);
    }
  };

  const resetAllPresets = () => {
    onPresetsChange(DEFAULT_WELCOME_PRESETS);
    toast.success('Todos os presets restaurados ao padrão');
  };

  // Default humanization for testing
  const defaultHumanization: HumanizationValues = {
    ...DEFAULT_HUMANIZATION_VALUES,
    ...DEFAULT_TOGGLE_VALUES,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-cyan-500" />
              Presets de Boas-vindas
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Textos e vozes para cada módulo do PWA
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetAllPresets}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Restaurar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.map((preset) => (
          <Collapsible
            key={preset.id}
            open={expandedPreset === preset.id}
            onOpenChange={(open) => setExpandedPreset(open ? preset.id : null)}
          >
            <CollapsibleTrigger asChild>
              <div
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                style={{ borderColor: `${preset.color}40` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${preset.color}20` }}
                  >
                    <div style={{ color: preset.color }}>{preset.icon}</div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {preset.text.substring(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: preset.color, color: preset.color }}
                  >
                    {preset.voice}
                  </Badge>
                  {expandedPreset === preset.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className="mt-2 p-4 rounded-lg border space-y-4"
                style={{
                  borderColor: `${preset.color}30`,
                  backgroundColor: `${preset.color}05`,
                }}
              >
                {/* Texto de Boas-vindas */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Texto de Boas-vindas</Label>
                  <Textarea
                    value={preset.text}
                    onChange={(e) => updatePreset(preset.id, { text: e.target.value })}
                    placeholder="Digite o texto de boas-vindas..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                    disabled={disabled}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Use <code className="bg-muted px-1 rounded">[name]</code> para o nome do usuário
                    </span>
                    <span>{preset.text.length}/500</span>
                  </div>
                </div>

                {/* Seletor de Voz */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Voz</Label>
                  <VoiceSelector
                    value={preset.voice}
                    onValueChange={(voice) => updatePreset(preset.id, { voice })}
                    disabled={disabled}
                  />
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2">
                  <TestVoiceButton
                    voice={preset.voice}
                    humanization={defaultHumanization}
                    moduleType={preset.id}
                    testText={preset.text.replace('[name]', 'Fernando')}
                    variant="default"
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPreset(preset.id)}
                    disabled={disabled}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                </div>

                {/* Preview */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Preview (com nome "Fernando"):</p>
                  <p className="text-sm italic">
                    "{preset.text.replace('[name]', 'Fernando')}"
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};

export default WelcomePresetsEditor;
