/**
 * VoiceConfigTab - Configuração de Voz
 * Permite selecionar e testar vozes do ElevenLabs
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Volume2, Play, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// Vozes disponíveis no ElevenLabs
const ELEVENLABS_VOICES = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Voz feminina clara e natural. Excelente para PT-BR.",
    gender: "Feminina",
    recommended: true
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Voz masculina profunda e confiante.",
    gender: "Masculina"
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    description: "Voz feminina jovem e amigável.",
    gender: "Feminina"
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    description: "Voz masculina forte e autoritária.",
    gender: "Masculina"
  },
  {
    id: "jsCqWAovK2LkecY7zXl4",
    name: "Callum",
    description: "Voz masculina suave e acolhedora.",
    gender: "Masculina"
  },
  {
    id: "ODq5zmih8GrVes37Dizd",
    name: "Patrick",
    description: "Voz masculina neutra e versátil.",
    gender: "Masculina"
  },
];

export function VoiceConfigTab() {
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestVoice = async (voiceId: string) => {
    setIsPlaying(voiceId);

    try {
      // Aqui você pode implementar a chamada real para testar a voz
      // Por enquanto, simula um delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Teste de voz concluído");
    } catch (error) {
      toast.error("Erro ao testar voz");
    } finally {
      setIsPlaying(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Salvar a configuração (pode ser localStorage, API, etc.)
      localStorage.setItem("elevenlabs_voice_id", selectedVoice);
      toast.success("Voz configurada com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle>Configuração de Voz</CardTitle>
          </div>
          <CardDescription>
            Selecione a voz que será usada pelo assistente de voz.
            Todas as vozes são fornecidas pelo ElevenLabs.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleção de Voz</CardTitle>
          <CardDescription>
            Escolha uma das vozes disponíveis. Você pode testar cada uma antes de salvar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedVoice}
            onValueChange={setSelectedVoice}
            className="space-y-3"
          >
            {ELEVENLABS_VOICES.map((voice) => (
              <div
                key={voice.id}
                className={`
                  flex items-center justify-between p-4 rounded-lg border transition-all
                  ${selectedVoice === voice.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'}
                `}
              >
                <div className="flex items-center gap-4">
                  <RadioGroupItem value={voice.id} id={voice.id} />
                  <Label htmlFor={voice.id} className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{voice.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {voice.gender}
                      </Badge>
                      {voice.recommended && (
                        <Badge className="bg-green-500/10 text-green-500 text-xs">
                          Recomendada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {voice.description}
                    </p>
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestVoice(voice.id)}
                  disabled={isPlaying !== null}
                >
                  {isPlaying === voice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span className="ml-2">Testar</span>
                </Button>
              </div>
            ))}
          </RadioGroup>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Volume2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium">Sobre as vozes</h4>
              <p className="text-sm text-muted-foreground mt-1">
                As vozes são sintetizadas pelo ElevenLabs usando o modelo <code>eleven_turbo_v2_5</code>,
                que oferece alta qualidade e baixa latência. A voz Rachel é recomendada para português brasileiro.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VoiceConfigTab;
