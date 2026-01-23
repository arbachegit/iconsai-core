/**
 * ============================================================
 * TestVoiceButton.tsx - Botão de Teste de Voz
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Funcionalidades:
 * - Gera áudio com as configurações atuais
 * - Play/Stop toggle
 * - Loading state durante geração
 * - Texto de teste customizável
 * ============================================================
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HumanizationValues } from './HumanizationSliders';

interface TestVoiceButtonProps {
  voice: string;
  humanization: HumanizationValues;
  instructions?: string;
  moduleType?: string;
  testText?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const DEFAULT_TEST_TEXT =
  'Olá! Esta é uma demonstração da voz configurada para o IconsAI Business. Estou usando as configurações de humanização que você definiu.';

export const TestVoiceButton: React.FC<TestVoiceButtonProps> = ({
  voice,
  humanization,
  instructions,
  moduleType = 'default',
  testText = DEFAULT_TEST_TEXT,
  variant = 'outline',
  size = 'default',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const generateInstructions = (): string => {
    if (instructions) return instructions;

    // Gerar instructions baseado nos sliders
    const warmthLevel =
      humanization.warmth > 70 ? 'very warm and welcoming' : humanization.warmth > 40 ? 'warm' : 'neutral';
    const enthusiasmLevel =
      humanization.enthusiasm > 70
        ? 'enthusiastic and energetic'
        : humanization.enthusiasm > 40
          ? 'engaged'
          : 'calm and measured';
    const paceLevel =
      humanization.pace > 70 ? 'dynamic with varied rhythm' : humanization.pace > 40 ? 'natural pacing' : 'slow and deliberate';
    const expressiveLevel =
      humanization.expressiveness > 70
        ? 'highly expressive with melodic variation'
        : humanization.expressiveness > 40
          ? 'moderately expressive'
          : 'subtle and restrained';
    const formalityLevel =
      humanization.formality > 70 ? 'formal and professional' : humanization.formality > 40 ? 'semi-formal' : 'casual and friendly';

    let generated = `
Voice Affect: ${warmthLevel}. Convey natural friendliness in Brazilian Portuguese.

Tone: ${enthusiasmLevel}, with ${formalityLevel} language.

Pacing: ${paceLevel}. ${humanization.speed < 0.9 ? 'Speak slower than normal.' : humanization.speed > 1.1 ? 'Speak faster than normal.' : 'Normal speaking speed.'}

Emotion: ${expressiveLevel}.

Intonation: Natural melodic variation typical of Brazilian Portuguese.
    `.trim();

    if (humanization.fillerWords) {
      generated += '\n\nFiller Words: Use occasionally - "então", "olha", "sabe" - to sound natural.';
    }

    if (humanization.naturalBreathing) {
      generated += '\n\nBreathing: Include natural breath pauses between sentences.';
    }

    if (humanization.emotionalResponses) {
      generated += '\n\nConnection: Adapt emotional tone based on context. Show genuine human connection.';
    }

    return generated;
  };

  const handlePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    try {
      const generatedInstructions = generateInstructions();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: testText,
            voice,
            chatType: moduleType,
            // As instructions são geradas no backend baseado no chatType
            // Mas podemos passar customInstructions se quisermos testar
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const audioBlob = await response.blob();

      // Cleanup previous audio URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        toast.error('Erro ao reproduzir áudio');
      };

      await audio.play();
      setIsPlaying(true);
      toast.success('Reproduzindo teste de voz...');
    } catch (err) {
      console.error('Erro ao testar voz:', err);
      toast.error('Erro ao gerar áudio de teste');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePlay}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Gerando...
        </>
      ) : isPlaying ? (
        <>
          <Square className="h-4 w-4 mr-2" />
          Parar
        </>
      ) : (
        <>
          <Play className="h-4 w-4 mr-2" />
          Testar Voz
        </>
      )}
    </Button>
  );
};

// Versão compacta para uso em tabelas
export const TestVoiceButtonCompact: React.FC<TestVoiceButtonProps> = (props) => {
  return (
    <TestVoiceButton
      {...props}
      variant="ghost"
      size="icon"
      className="h-8 w-8"
    />
  );
};

export default TestVoiceButton;
