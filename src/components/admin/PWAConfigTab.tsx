import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Smartphone, Volume2, Clock, MessageSquare, Zap, Heart, Lightbulb, Globe, HelpCircle, Monitor, AlertTriangle, RefreshCw } from "lucide-react";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PWAConfigTab = () => {
  const { config, isLoading, isSaving, updateConfig, saveConfig, resetToDefaults } = useConfigPWA();
  const [allowDesktopAccess, setAllowDesktopAccess] = useState(false);
  const [isLoadingDesktop, setIsLoadingDesktop] = useState(true);
  const [isSavingDesktop, setIsSavingDesktop] = useState(false);

  // Carregar configuração de acesso desktop
  useEffect(() => {
    const loadDesktopConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("pwa_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (!error && data) {
          setAllowDesktopAccess(data.config_value === "true");
        }
      } catch (err) {
        console.log("[PWAConfigTab] Config not found, using default");
      } finally {
        setIsLoadingDesktop(false);
      }
    };

    loadDesktopConfig();
  }, []);

  // Toggle acesso desktop
  const handleToggleDesktopAccess = async () => {
    setIsSavingDesktop(true);
    const newValue = !allowDesktopAccess;

    try {
      const { error } = await supabase
        .from("pwa_config")
        .update({
          config_value: String(newValue),
          updated_at: new Date().toISOString(),
        })
        .eq("config_key", "allow_desktop_access");

      if (error) throw error;

      setAllowDesktopAccess(newValue);
      toast.success(newValue ? "Acesso desktop liberado!" : "Acesso desktop bloqueado!");
    } catch (err) {
      console.error("[PWAConfigTab] Error updating desktop access:", err);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setIsSavingDesktop(false);
    }
  };

  if (isLoading || isLoadingDesktop) {
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

      {/* Toggle Acesso Desktop - Para testes */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Acesso por Dispositivo
          </CardTitle>
          <CardDescription>Controle o acesso ao PWA por tipo de dispositivo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Acesso Desktop */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Label htmlFor="allow-desktop" className="text-base font-medium">
                  Permitir Acesso Desktop
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativado, o PWA pode ser acessado pelo computador (útil para testes)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={allowDesktopAccess ? "default" : "secondary"}>
                {allowDesktopAccess ? "Ativo" : "Inativo"}
              </Badge>
              <Switch
                id="allow-desktop"
                checked={allowDesktopAccess}
                onCheckedChange={handleToggleDesktopAccess}
                disabled={isSavingDesktop}
              />
            </div>
          </div>

          {/* Aviso quando ativo */}
          {allowDesktopAccess && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Modo de Teste Ativo</p>
                    <p className="text-muted-foreground">
                      O acesso desktop está liberado. Lembre-se de desativar após os testes
                      para manter a experiência mobile-first do PWA.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

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
