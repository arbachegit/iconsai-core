import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, RotateCcw, Smartphone, Volume2, Clock, MessageSquare, Mic, Zap, Heart, Lightbulb, Globe, HelpCircle } from "lucide-react";
import { useConfigPWA } from "@/hooks/useConfigPWA";

const PWAConfigTab = () => {
  const { config, isLoading, isSaving, updateConfig, saveConfig, resetToDefaults } = useConfigPWA();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Configurações do PWA</h2>
            <p className="text-muted-foreground">Gerencie textos, voz e comportamento do PWA de voz</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button onClick={saveConfig} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>Parâmetros básicos do PWA de voz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ttsVoice">Voz TTS (ElevenLabs)</Label>
              <Input
                id="ttsVoice"
                value={config.ttsVoice}
                onChange={(e) => updateConfig("ttsVoice", e.target.value)}
                placeholder="fernando"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="micTimeout">Timeout do Microfone (segundos)</Label>
              <Input
                id="micTimeout"
                type="number"
                value={config.micTimeoutSeconds}
                onChange={(e) => updateConfig("micTimeoutSeconds", parseInt(e.target.value) || 10)}
                min={5}
                max={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="splashDuration">Duração do Splash (ms)</Label>
              <Input
                id="splashDuration"
                type="number"
                value={config.splashDurationMs}
                onChange={(e) => updateConfig("splashDurationMs", parseInt(e.target.value) || 3000)}
                min={1000}
                max={10000}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="enableCountdown">Habilitar Countdown</Label>
                <p className="text-sm text-muted-foreground">Mostra contagem regressiva no microfone</p>
              </div>
              <Switch
                id="enableCountdown"
                checked={config.enableCountdown}
                onCheckedChange={(checked) => updateConfig("enableCountdown", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Texto de Boas-Vindas Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Texto de Boas-Vindas (Home)
          </CardTitle>
          <CardDescription>Texto principal exibido na tela inicial do PWA</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.welcomeText}
            onChange={(e) => updateConfig("welcomeText", e.target.value)}
            rows={6}
            placeholder="Olá! Eu sou o KnowYOU..."
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Textos dos Módulos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Textos de Boas-Vindas dos Módulos
          </CardTitle>
          <CardDescription>Mensagens personalizadas para cada módulo do PWA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-500" />
              Módulo: Ajuda
            </Label>
            <Textarea
              value={config.helpWelcomeText}
              onChange={(e) => updateConfig("helpWelcomeText", e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500" />
              Módulo: Mundo
            </Label>
            <Textarea
              value={config.worldWelcomeText}
              onChange={(e) => updateConfig("worldWelcomeText", e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Módulo: Saúde
            </Label>
            <Textarea
              value={config.healthWelcomeText}
              onChange={(e) => updateConfig("healthWelcomeText", e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Módulo: Ideias
            </Label>
            <Textarea
              value={config.ideasWelcomeText}
              onChange={(e) => updateConfig("ideasWelcomeText", e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Controles de Voz ElevenLabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Controles de Voz (ElevenLabs)
          </CardTitle>
          <CardDescription>Ajuste fino dos parâmetros de síntese de voz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Estabilidade</Label>
                <span className="text-sm font-mono text-muted-foreground">{config.voiceStability.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.voiceStability]}
                onValueChange={([v]) => updateConfig("voiceStability", v)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Maior = voz mais consistente, menor = mais expressiva</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Similaridade</Label>
                <span className="text-sm font-mono text-muted-foreground">{config.voiceSimilarity.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.voiceSimilarity]}
                onValueChange={([v]) => updateConfig("voiceSimilarity", v)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Fidelidade à voz original do modelo</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Estilo</Label>
                <span className="text-sm font-mono text-muted-foreground">{config.voiceStyle.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.voiceStyle]}
                onValueChange={([v]) => updateConfig("voiceStyle", v)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Intensidade do estilo de fala</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Velocidade</Label>
                <span className="text-sm font-mono text-muted-foreground">{config.voiceSpeed.toFixed(2)}x</span>
              </div>
              <Slider
                value={[config.voiceSpeed]}
                onValueChange={([v]) => updateConfig("voiceSpeed", v)}
                min={0.5}
                max={2}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Velocidade de reprodução da voz</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="speakerBoost">Speaker Boost</Label>
              <p className="text-sm text-muted-foreground">Melhora a clareza em ambientes ruidosos</p>
            </div>
            <Switch
              id="speakerBoost"
              checked={config.voiceSpeakerBoost}
              onCheckedChange={(checked) => updateConfig("voiceSpeakerBoost", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAConfigTab;
