/**
 * ============================================================
 * InstructionsEditor.tsx - Editor de Instructions TTS
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Funcionalidades:
 * - Textarea editável para instructions
 * - Preview em tempo real
 * - Templates pré-definidos
 * - Contador de caracteres
 * - Botão de reset para padrão
 * ============================================================
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { HUMANIZATION_INSTRUCTIONS } from './voice-constants';

interface InstructionsEditorProps {
  value: string;
  onChange: (value: string) => void;
  moduleType?: string;
  disabled?: boolean;
}

// Templates de instructions por tipo de uso
const INSTRUCTION_TEMPLATES: Record<string, { name: string; template: string }> = {
  welcoming: {
    name: 'Acolhedor (Home)',
    template: `Voice Affect: Warm, welcoming, and genuinely happy to see you.

Tone: Inviting and friendly. Creates a sense of belonging.

Pacing: Relaxed and natural. Unhurried greeting.

Emotion: Genuine warmth and happiness. Shows real pleasure in connecting.

Demeanor: Hospitable host who makes everyone feel welcome.

Filler Words: Natural expressions - "então", "olha", "que bom".

Intonation: Warm melodic rises that convey welcome.

Connection: Speak as if opening your home to a friend.`,
  },
  caring: {
    name: 'Cuidadoso (Saúde)',
    template: `Voice Affect: Warm, caring, and gently reassuring.

Tone: Compassionate and supportive, with calm confidence.

Pacing: Calm and unhurried. Extra pauses for important health information.

Emotion: Deeply empathetic with subtle warmth. Gentle encouragement.

Demeanor: Caring, patient, and supportive.

Filler Words: Occasionally use "olha", "sabe", "então" to soften medical information.

Intonation: Soothing rises and falls. Softened delivery for sensitive topics.

Connection: Speak with genuine care and empathy.`,
  },
  creative: {
    name: 'Criativo (Ideias)',
    template: `Voice Affect: Enthusiastic, curious, and creatively energized.

Tone: Playful yet thoughtful. Encourages exploration.

Pacing: Dynamic - speeds up slightly with excitement, slows for impactful ideas.

Emotion: Openly enthusiastic and curious. Shows genuine delight.

Demeanor: Creative collaborator and cheerleader.

Filler Words: More frequent - "nossa", "olha só", "que legal".

Intonation: Expressive and varied. Clear excitement in pitch rises.

Connection: Speak as a creative partner. Build excitement together.`,
  },
  educational: {
    name: 'Educativo (Mundo)',
    template: `Voice Affect: Knowledgeable, clear, and engaging.

Tone: Educational but never condescending, like a great teacher.

Pacing: Steady pace with natural pauses between key points.

Emotion: Curious and genuinely interested in sharing knowledge.

Demeanor: Wise mentor who loves teaching.

Filler Words: Minimal - occasionally use "veja", "perceba", "note que".

Intonation: Clear emphasis on key facts and findings.

Connection: Speak as a trusted source of knowledge.`,
  },
  helpful: {
    name: 'Prestativo (Ajuda)',
    template: `Voice Affect: Warm, friendly, and naturally conversational.

Tone: Approachable and helpful, like a knowledgeable friend.

Pacing: Natural rhythm with appropriate pauses for comprehension.

Emotion: Genuinely interested and engaged, with subtle enthusiasm.

Demeanor: Patient helper who enjoys assisting.

Filler Words: Natural use of "então", "olha", "veja".

Intonation: Clear and helpful. Emphasis on important steps.

Connection: Speak as a supportive guide.`,
  },
};

export const InstructionsEditor: React.FC<InstructionsEditorProps> = ({
  value,
  onChange,
  moduleType = 'default',
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTemplateSelect = (templateKey: string) => {
    const template = INSTRUCTION_TEMPLATES[templateKey];
    if (template) {
      onChange(template.template);
      toast.success(`Template "${template.name}" aplicado`);
    }
  };

  const handleReset = () => {
    // Determinar template padrão baseado no moduleType
    const defaultTemplates: Record<string, string> = {
      home: 'welcoming',
      health: 'caring',
      ideas: 'creative',
      world: 'educational',
      help: 'helpful',
      default: 'welcoming',
    };
    const templateKey = defaultTemplates[moduleType] || 'welcoming';
    handleTemplateSelect(templateKey);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Instructions copiadas!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Instructions TTS
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Instruções detalhadas para humanização da voz (IconsAI-voice-tts)
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {value.length} caracteres
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Template:</Label>
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um template..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INSTRUCTION_TEMPLATES).map(([key, template]) => (
                <SelectItem key={key} value={key}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleReset} title="Restaurar padrão">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copiar">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Textarea */}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite as instructions para humanização da voz..."
          className="min-h-[200px] font-mono text-sm"
          disabled={disabled}
        />

        {/* Guia de Parâmetros */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" size="sm">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Guia de Parâmetros
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2 text-xs">
              {Object.entries(HUMANIZATION_INSTRUCTIONS).map(([key, description]) => (
                <div key={key} className="flex gap-2">
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {key}
                  </Badge>
                  <span className="text-muted-foreground">{description}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Dica */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300">
            <strong>Dica:</strong> As instructions controlam como o modelo IconsAI-voice-tts
            interpreta e vocaliza o texto. Inclua Voice Affect, Tone, Pacing, Emotion,
            e outros parâmetros para máxima humanização.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstructionsEditor;
