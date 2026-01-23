/**
 * ============================================================
 * HumanizationSliders.tsx - 5 Sliders + 3 Toggles de Humanização
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Sliders:
 * - Warmth (Calor): 0-100
 * - Enthusiasm (Entusiasmo): 0-100
 * - Pace (Ritmo): 0-100
 * - Expressiveness (Expressividade): 0-100
 * - Formality (Formalidade): 0-100
 * - Speed (Velocidade): 0.5-1.5
 *
 * Toggles:
 * - Filler Words (Palavras de preenchimento)
 * - Natural Breathing (Pausas de respiração)
 * - Emotional Responses (Respostas emocionais)
 * ============================================================
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Zap,
  Timer,
  Sparkles,
  GraduationCap,
  Gauge,
  MessageCircle,
  Wind,
  Smile,
} from 'lucide-react';

export interface HumanizationValues {
  warmth: number;
  enthusiasm: number;
  pace: number;
  expressiveness: number;
  formality: number;
  speed: number;
  fillerWords: boolean;
  naturalBreathing: boolean;
  emotionalResponses: boolean;
}

interface HumanizationSlidersProps {
  values: HumanizationValues;
  onChange: (values: HumanizationValues) => void;
  disabled?: boolean;
}

export const HumanizationSliders: React.FC<HumanizationSlidersProps> = ({
  values,
  onChange,
  disabled = false,
}) => {
  const updateValue = (key: keyof HumanizationValues, value: number | boolean) => {
    onChange({ ...values, [key]: value });
  };

  const getSliderLabel = (value: number, type: 'warmth' | 'enthusiasm' | 'pace' | 'expressiveness' | 'formality') => {
    const labels: Record<string, string[]> = {
      warmth: ['Frio', 'Neutro', 'Caloroso', 'Muito Caloroso'],
      enthusiasm: ['Contido', 'Moderado', 'Entusiasmado', 'Muito Entusiasmado'],
      pace: ['Lento', 'Normal', 'Dinâmico', 'Rápido'],
      expressiveness: ['Monótono', 'Sutil', 'Expressivo', 'Muito Expressivo'],
      formality: ['Casual', 'Semi-formal', 'Formal', 'Muito Formal'],
    };
    const index = Math.min(Math.floor(value / 25), 3);
    return labels[type][index];
  };

  return (
    <div className="space-y-6">
      {/* Sliders de Humanização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Parâmetros de Humanização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warmth */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Heart className="h-4 w-4 text-rose-500" />
                Calor (Warmth)
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{values.warmth}%</Badge>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel(values.warmth, 'warmth')}
                </span>
              </div>
            </div>
            <Slider
              value={[values.warmth]}
              onValueChange={([v]) => updateValue('warmth', v)}
              min={0}
              max={100}
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Define o quão acolhedora e calorosa será a voz
            </p>
          </div>

          {/* Enthusiasm */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-yellow-500" />
                Entusiasmo (Enthusiasm)
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{values.enthusiasm}%</Badge>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel(values.enthusiasm, 'enthusiasm')}
                </span>
              </div>
            </div>
            <Slider
              value={[values.enthusiasm]}
              onValueChange={([v]) => updateValue('enthusiasm', v)}
              min={0}
              max={100}
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Nível de energia e animação na fala
            </p>
          </div>

          {/* Pace */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Timer className="h-4 w-4 text-blue-500" />
                Ritmo (Pace)
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{values.pace}%</Badge>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel(values.pace, 'pace')}
                </span>
              </div>
            </div>
            <Slider
              value={[values.pace]}
              onValueChange={([v]) => updateValue('pace', v)}
              min={0}
              max={100}
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Variação de velocidade durante a fala (pausas dramáticas, acelerações)
            </p>
          </div>

          {/* Expressiveness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Expressividade
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{values.expressiveness}%</Badge>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel(values.expressiveness, 'expressiveness')}
                </span>
              </div>
            </div>
            <Slider
              value={[values.expressiveness]}
              onValueChange={([v]) => updateValue('expressiveness', v)}
              min={0}
              max={100}
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Variação melódica e entonação na voz
            </p>
          </div>

          {/* Formality */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
                Formalidade
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{values.formality}%</Badge>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel(values.formality, 'formality')}
                </span>
              </div>
            </div>
            <Slider
              value={[values.formality]}
              onValueChange={([v]) => updateValue('formality', v)}
              min={0}
              max={100}
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              0% = muito casual, 100% = muito formal
            </p>
          </div>

          {/* Speed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Gauge className="h-4 w-4 text-orange-500" />
                Velocidade (Speed)
              </Label>
              <Badge variant="outline" className="font-mono">
                {values.speed.toFixed(2)}x
              </Badge>
            </div>
            <Slider
              value={[values.speed]}
              onValueChange={([v]) => updateValue('speed', v)}
              min={0.5}
              max={1.5}
              step={0.05}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lento (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Rápido (1.5x)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-500" />
            Efeitos de Naturalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filler Words */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-cyan-500" />
              <div>
                <Label className="text-sm font-medium">Palavras de Preenchimento</Label>
                <p className="text-xs text-muted-foreground">
                  Usa "então", "olha", "sabe" para soar natural
                </p>
              </div>
            </div>
            <Switch
              checked={values.fillerWords}
              onCheckedChange={(v) => updateValue('fillerWords', v)}
              disabled={disabled}
            />
          </div>

          {/* Natural Breathing */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Wind className="h-5 w-5 text-teal-500" />
              <div>
                <Label className="text-sm font-medium">Respiração Natural</Label>
                <p className="text-xs text-muted-foreground">
                  Pausas de respiração entre frases longas
                </p>
              </div>
            </div>
            <Switch
              checked={values.naturalBreathing}
              onCheckedChange={(v) => updateValue('naturalBreathing', v)}
              disabled={disabled}
            />
          </div>

          {/* Emotional Responses */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Smile className="h-5 w-5 text-yellow-500" />
              <div>
                <Label className="text-sm font-medium">Respostas Emocionais</Label>
                <p className="text-xs text-muted-foreground">
                  Adapta tom baseado no contexto emocional
                </p>
              </div>
            </div>
            <Switch
              checked={values.emotionalResponses}
              onCheckedChange={(v) => updateValue('emotionalResponses', v)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HumanizationSliders;
