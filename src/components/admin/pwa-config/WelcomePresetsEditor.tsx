/**
 * ============================================================
 * WelcomePresetsEditor.tsx - Editor de Textos de Boas-vindas
 * ============================================================
 * Versão: 2.0.0
 * Data: 2026-01-23
 *
 * Funcionalidades:
 * - Texto de boas-vindas global (Home)
 * - Textos por módulo (Ajuda, Mundo, Saúde, Ideias)
 * - Suporte a placeholder [name] para nome do usuário
 * - Botão de teste de voz por preset
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Home,
  HelpCircle,
  Globe,
  Heart,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TestVoiceButton } from './TestVoiceButton';

export interface WelcomePreset {
  id: string;
  name: string;
  icon: string;
  color: string;
  text: string;
  configKey: string;
}

export const DEFAULT_WELCOME_PRESETS: WelcomePreset[] = [
  {
    id: 'home',
    name: 'Home (Boas-vindas)',
    icon: 'Home',
    color: '#00D4FF',
    text: 'Olá [name]! Bem-vindo ao IconsAI Business. Como posso ajudar você hoje?',
    configKey: 'welcome_text',
  },
  {
    id: 'help',
    name: 'Módulo Ajuda',
    icon: 'HelpCircle',
    color: '#6366F1',
    text: 'Olá [name]! Estou aqui para ajudar você. Me conte o que precisa e vou fazer o meu melhor para resolver.',
    configKey: 'help_welcome_text',
  },
  {
    id: 'world',
    name: 'Módulo Mundo',
    icon: 'Globe',
    color: '#10B981',
    text: 'Olá [name]! Vamos explorar o mundo juntos. Pergunte sobre qualquer assunto que eu te ajudo a entender.',
    configKey: 'world_welcome_text',
  },
  {
    id: 'health',
    name: 'Módulo Saúde',
    icon: 'Heart',
    color: '#FF6B6B',
    text: 'Olá [name]! Estou aqui para conversar sobre bem-estar e saúde. Lembre-se: sou um assistente, não substituo profissionais de saúde.',
    configKey: 'health_welcome_text',
  },
  {
    id: 'ideas',
    name: 'Módulo Ideias',
    icon: 'Lightbulb',
    color: '#F59E0B',
    text: 'Olá [name]! Vamos criar juntos! Me conta sua ideia e vou ajudar a desenvolver e expandir.',
    configKey: 'ideas_welcome_text',
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  HelpCircle,
  Globe,
  Heart,
  Lightbulb,
};

interface WelcomePresetsEditorProps {
  disabled?: boolean;
}

export const WelcomePresetsEditor: React.FC<WelcomePresetsEditorProps> = ({
  disabled = false,
}) => {
  const [presets, setPresets] = useState<WelcomePreset[]>(DEFAULT_WELCOME_PRESETS);
  const [expandedPresets, setExpandedPresets] = useState<Record<string, boolean>>({
    home: true, // Home expandido por padrão
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar presets do banco
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const configKeys = DEFAULT_WELCOME_PRESETS.map(p => p.configKey);

      const { data, error } = await supabase
        .from('pwa_config')
        .select('config_key, config_value')
        .in('config_key', configKeys);

      if (error) throw error;

      if (data && data.length > 0) {
        const configMap = Object.fromEntries(
          data.map(c => [c.config_key, c.config_value])
        );

        setPresets(prev => prev.map(preset => ({
          ...preset,
          text: configMap[preset.configKey] || preset.text,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePresetText = (presetId: string, text: string) => {
    setPresets(prev => prev.map(p =>
      p.id === presetId ? { ...p, text } : p
    ));
  };

  const savePreset = async (preset: WelcomePreset) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pwa_config')
        .upsert({
          config_key: preset.configKey,
          config_value: preset.text,
          config_type: 'text',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'config_key' });

      if (error) throw error;
      toast.success(`Texto de "${preset.name}" salvo!`);
    } catch (error) {
      console.error('Erro ao salvar preset:', error);
      toast.error('Erro ao salvar texto');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllPresets = async () => {
    setIsSaving(true);
    try {
      for (const preset of presets) {
        await supabase
          .from('pwa_config')
          .upsert({
            config_key: preset.configKey,
            config_value: preset.text,
            config_type: 'text',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'config_key' });
      }
      toast.success('Todos os textos de boas-vindas salvos!');
    } catch (error) {
      console.error('Erro ao salvar presets:', error);
      toast.error('Erro ao salvar textos');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpanded = (presetId: string) => {
    setExpandedPresets(prev => ({
      ...prev,
      [presetId]: !prev[presetId],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando textos de boas-vindas...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Textos de Boas-vindas
        </CardTitle>
        <CardDescription>
          Configure os textos de apresentação para cada módulo do PWA.
          Use <code className="bg-muted px-1 rounded">[name]</code> para inserir o nome do usuário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {presets.map((preset) => {
          const IconComponent = ICON_MAP[preset.icon] || Home;
          const isExpanded = expandedPresets[preset.id] ?? false;

          return (
            <Collapsible
              key={preset.id}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(preset.id)}
            >
              <div
                className="rounded-lg border p-4"
                style={{ borderColor: `${preset.color}30`, backgroundColor: `${preset.color}05` }}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${preset.color}20` }}
                      >
                        <IconComponent
                          className="h-5 w-5"
                          style={{ color: preset.color }}
                        />
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium">{preset.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {preset.text.length}/500 caracteres
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{ borderColor: preset.color, color: preset.color }}
                      >
                        {preset.id}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`preset-${preset.id}`}>Texto de Apresentação</Label>
                    <Textarea
                      id={`preset-${preset.id}`}
                      value={preset.text}
                      onChange={(e) => updatePresetText(preset.id, e.target.value)}
                      placeholder={`Digite o texto de boas-vindas para ${preset.name}...`}
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                      disabled={disabled || isSaving}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Use <code className="bg-muted px-1 rounded">[name]</code> para o nome do usuário
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {preset.text.length}/500
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <TestVoiceButton
                      voice="nova"
                      testText={preset.text.replace('[name]', 'Usuário')}
                      moduleType={preset.id}
                      variant="outline"
                      size="sm"
                    />
                    <button
                      onClick={() => savePreset(preset)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Botão Salvar Todos */}
        <div className="pt-4 border-t">
          <button
            onClick={saveAllPresets}
            disabled={isSaving}
            className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
          >
            {isSaving ? 'Salvando...' : 'Salvar Todos os Textos'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomePresetsEditor;
