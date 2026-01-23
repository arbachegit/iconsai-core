/**
 * ============================================================
 * VoiceComparisonTable.tsx - Tabela Comparativa tts-1 vs gpt-4o-mini-tts
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Mostra diferenças visuais entre:
 * - tts-1 (modelo básico)
 * - gpt-4o-mini-tts (modelo avançado com instructions)
 * ============================================================
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Info, Zap, DollarSign, Clock, Sparkles } from 'lucide-react';
import { TTS_MODEL_COMPARISON } from './voice-constants';

interface ComparisonFeature {
  name: string;
  description: string;
  icon: React.ReactNode;
  tts1: boolean | string;
  gpt4oMiniTts: boolean | string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    name: 'Suporte a Instructions',
    description: 'Permite controle detalhado da voz via texto',
    icon: <Sparkles className="h-4 w-4" />,
    tts1: false,
    gpt4oMiniTts: true,
    importance: 'critical',
  },
  {
    name: 'Voice Affect',
    description: 'Controle do tom emocional (caloroso, frio, etc)',
    icon: <Sparkles className="h-4 w-4" />,
    tts1: false,
    gpt4oMiniTts: true,
    importance: 'critical',
  },
  {
    name: 'Emoção Contextual',
    description: 'Adapta emoção baseado no conteúdo',
    icon: <Sparkles className="h-4 w-4" />,
    tts1: false,
    gpt4oMiniTts: true,
    importance: 'high',
  },
  {
    name: 'Controle de Pacing',
    description: 'Variação de velocidade durante a fala',
    icon: <Clock className="h-4 w-4" />,
    tts1: false,
    gpt4oMiniTts: true,
    importance: 'high',
  },
  {
    name: 'Filler Words',
    description: 'Palavras de preenchimento (então, olha, sabe)',
    icon: <Sparkles className="h-4 w-4" />,
    tts1: false,
    gpt4oMiniTts: true,
    importance: 'medium',
  },
  {
    name: 'Respiração Natural',
    description: 'Pausas de respiração entre frases',
    icon: <Sparkles className="h-4 w-4" />,
    tts1: false,
    gpt4oMiniTts: true,
    importance: 'medium',
  },
  {
    name: 'Entonação PT-BR',
    description: 'Melodia natural do português brasileiro',
    icon: <Sparkles className="h-4 w-4" />,
    tts1: 'Limitado',
    gpt4oMiniTts: true,
    importance: 'high',
  },
  {
    name: 'Qualidade de Áudio',
    description: 'Clareza e naturalidade da voz',
    icon: <Zap className="h-4 w-4" />,
    tts1: 'Básica',
    gpt4oMiniTts: 'Alta',
    importance: 'high',
  },
  {
    name: 'Latência',
    description: 'Tempo para gerar o áudio',
    icon: <Clock className="h-4 w-4" />,
    tts1: 'Baixa',
    gpt4oMiniTts: 'Média',
    importance: 'low',
  },
  {
    name: 'Custo',
    description: 'Preço por caractere processado',
    icon: <DollarSign className="h-4 w-4" />,
    tts1: '$',
    gpt4oMiniTts: '$$',
    importance: 'low',
  },
];

const renderValue = (value: boolean | string) => {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-500" />;
  }
  if (value === false) {
    return <X className="h-5 w-5 text-red-500" />;
  }
  return <span className="text-sm font-medium">{value}</span>;
};

const getImportanceBadge = (importance: ComparisonFeature['importance']) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    critical: { variant: 'default', label: 'Crítico' },
    high: { variant: 'secondary', label: 'Alto' },
    medium: { variant: 'outline', label: 'Médio' },
    low: { variant: 'outline', label: 'Baixo' },
  };
  const config = variants[importance];
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
};

export const VoiceComparisonTable: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Comparação de Modelos TTS
        </CardTitle>
        <CardDescription className="text-xs">
          Diferenças entre tts-1 (básico) e gpt-4o-mini-tts (avançado com instructions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-muted bg-muted/30">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              tts-1
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Modelo básico de TTS</li>
              <li>• Sem controle de humanização</li>
              <li>• Voz robótica e previsível</li>
              <li>• Baixa latência</li>
              <li>• Custo menor</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              gpt-4o-mini-tts (Recomendado)
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong className="text-green-500">Instructions completas</strong></li>
              <li>• <strong className="text-green-500">Voz humanizada</strong></li>
              <li>• Emoção e pacing adaptáveis</li>
              <li>• Latência moderada</li>
              <li>• Melhor custo-benefício</li>
            </ul>
          </div>
        </div>

        {/* Tabela Comparativa */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40%]">Recurso</TableHead>
                <TableHead className="text-center w-[20%]">tts-1</TableHead>
                <TableHead className="text-center w-[20%] bg-green-500/10">gpt-4o-mini-tts</TableHead>
                <TableHead className="text-center w-[20%]">Importância</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_FEATURES.map((feature) => (
                <TableRow key={feature.name}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">{feature.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{feature.name}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{renderValue(feature.tts1)}</TableCell>
                  <TableCell className="text-center bg-green-500/5">
                    {renderValue(feature.gpt4oMiniTts)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getImportanceBadge(feature.importance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Conclusão */}
        <div className="mt-4 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
          <h4 className="font-semibold text-sm text-green-500 mb-2">
            Por que usamos gpt-4o-mini-tts?
          </h4>
          <p className="text-xs text-muted-foreground">
            O modelo <strong>gpt-4o-mini-tts</strong> é a escolha ideal para o IconsAI Business porque
            suporta <strong>instructions detalhadas</strong> que permitem criar uma voz genuinamente
            humanizada. Diferente do tts-1, ele entende contexto emocional, pode usar palavras de
            preenchimento naturais ("então", "olha"), pausas de respiração, e adaptar o tom baseado
            no conteúdo. Isso transforma uma voz robótica em uma experiência conversacional autêntica.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceComparisonTable;
