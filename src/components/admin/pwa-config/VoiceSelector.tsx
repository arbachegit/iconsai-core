/**
 * ============================================================
 * VoiceSelector.tsx - Dropdown com 13 vozes OpenAI
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Mostra:
 * - Nome da voz
 * - Gênero (badge colorido)
 * - Características
 * - Recomendação de uso
 * ============================================================
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Volume2 } from 'lucide-react';
import { OPENAI_VOICES, type VoiceOption } from './voice-constants';

interface VoiceSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const selectedVoice = OPENAI_VOICES.find((v) => v.id === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma voz">
            {selectedVoice && (
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" style={{ color: selectedVoice.color }} />
                <span>{selectedVoice.name}</span>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: selectedVoice.color,
                    color: selectedVoice.color,
                  }}
                >
                  {selectedVoice.gender}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPENAI_VOICES.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" style={{ color: voice.color }} />
                  <span className="font-medium">{voice.name}</span>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: voice.color,
                      color: voice.color,
                    }}
                  >
                    {voice.gender}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground pl-6">
                  <p>{voice.characteristics}</p>
                  <p className="text-primary/70 italic">{voice.recommendations}</p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Preview da voz selecionada */}
      {selectedVoice && (
        <div
          className="p-3 rounded-lg border"
          style={{
            borderColor: `${selectedVoice.color}30`,
            backgroundColor: `${selectedVoice.color}10`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedVoice.color }}
            />
            <span className="font-medium text-sm">{selectedVoice.name}</span>
            <Badge variant="secondary" className="text-xs">
              {selectedVoice.gender}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{selectedVoice.characteristics}</p>
          <p className="text-xs mt-1 text-primary/80">{selectedVoice.recommendations}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceSelector;
