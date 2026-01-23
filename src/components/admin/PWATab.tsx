import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Smartphone, Copy, CheckCircle, Loader2,
  Settings, RotateCcw, Save, Play, Heart,
  Monitor, AlertTriangle, MessageSquare,
  Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { VoiceHumanizationPanel } from "./pwa-config";

export default function PWATab() {
  const [copied, setCopied] = useState(false);
  const [allowDesktopAccess, setAllowDesktopAccess] = useState(false);
  const [isLoadingDesktop, setIsLoadingDesktop] = useState(true);
  const [isSavingDesktop, setIsSavingDesktop] = useState(false);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);

  // PWA Health states
  const [allowPWAHealthDesktopAccess, setAllowPWAHealthDesktopAccess] = useState(false);
  const [isLoadingPWAHealthDesktop, setIsLoadingPWAHealthDesktop] = useState(true);

  const { config, isLoading: configLoading, isSaving, updateConfig, saveConfig, resetToDefaults } = useConfigPWA();

  const pwaUrl = `${window.location.origin}/pwa`;

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
        console.log("[PWATab] Config not found, using default");
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
        .upsert({
          config_key: "allow_desktop_access",
          config_value: String(newValue),
          config_type: "boolean",
          updated_at: new Date().toISOString(),
        }, { onConflict: "config_key" });

      if (error) throw error;

      setAllowDesktopAccess(newValue);
      toast.success(newValue ? "Acesso desktop liberado" : "Acesso desktop bloqueado");
    } catch (err) {
      console.error("[PWATab] Erro ao salvar:", err);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSavingDesktop(false);
    }
  };

  // Carregar configurações do PWA Health
  useEffect(() => {
    const loadPWAHealthConfig = async () => {
      try {
        const { data: desktopData } = await supabase
          .from("pwacity_config") // PWA Health usa mesma tabela do PWA City
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (desktopData) {
          setAllowPWAHealthDesktopAccess(desktopData.config_value === "true");
        }
      } catch (err) {
        console.log("[PWATab] PWA Health config not found, using defaults");
      } finally {
        setIsLoadingPWAHealthDesktop(false);
      }
    };

    loadPWAHealthConfig();
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(pwaUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          <Smartphone className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Config. PWA - IconsAI Business</h2>
          <p className="text-muted-foreground">
            Configurações do aplicativo de voz
          </p>
        </div>
      </div>

      {/* Acesso por Dispositivo */}
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
              {isLoadingDesktop ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Badge variant={allowDesktopAccess ? "default" : "secondary"}>
                    {allowDesktopAccess ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch
                    id="allow-desktop"
                    checked={allowDesktopAccess}
                    onCheckedChange={handleToggleDesktopAccess}
                    disabled={isSavingDesktop}
                  />
                </>
              )}
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

      {/* Demonstração e Vendas */}
      <Card className="border-2 border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-yellow-500" />
            Demonstração e Vendas
          </CardTitle>
          <CardDescription>
            Abra demos pré-configuradas para apresentar aos clientes (sem necessidade de login)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso Global */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-500">Acesso Rápido para Vendas</p>
                  <p className="text-muted-foreground">
                    Clique nos botões abaixo para abrir demos sem necessidade de login ou configuração. Perfeito para apresentações!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PWA Principal (IconsAI Business) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">PWA Principal (IconsAI Business)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwa?demo=clean`, "_blank");
                  toast.success("Abrindo demo limpo do PWA Principal");
                }}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Demo Limpo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwa?demo=seeded`, "_blank");
                  toast.success("Abrindo demo com histórico do PWA Principal");
                }}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Demo com Histórico
              </Button>
            </div>
          </div>

          <Separator />

          {/* PWA Health (Saúde) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <h3 className="font-semibold text-sm">PWA Health (Saúde)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwahealth?demo=clean`, "_blank");
                  toast.success("Abrindo demo limpo do PWA Health");
                }}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Demo Limpo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`${window.location.origin}/pwahealth?demo=seeded`, "_blank");
                  toast.success("Abrindo demo com histórico do PWA Health");
                }}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Demo com Histórico
              </Button>
            </div>
          </div>

          {/* Explicação */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">✨ Como funciona:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• <strong>Demo Limpo:</strong> Sem histórico, ideal para primeira apresentação</li>
              <li>• <strong>Demo com Histórico:</strong> Conversas de exemplo já carregadas, mostra o potencial</li>
              <li>• <strong>Sem login:</strong> Acesso imediato sem credenciais</li>
              <li>• <strong>Seguro:</strong> Nenhuma conversa é salva no banco de dados</li>
              <li>• <strong>Desktop liberado:</strong> Funciona automaticamente no computador</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Link do PWA */}
      <Card>
        <CardHeader>
          <CardTitle>Link para Instalação</CardTitle>
          <CardDescription>
            Envie este link para o usuário instalar o app no celular
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={pwaUrl}
              readOnly
              className="bg-muted font-mono text-sm"
            />
            <Button onClick={copyLink} variant="outline">
              {copied ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="font-medium mb-2">Instruções para o usuário:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Android:</strong> Abra o link no Chrome → Menu (⋮) → "Instalar aplicativo"</li>
              <li>• <strong>iPhone:</strong> Abra no Safari → Compartilhar (↑) → "Adicionar à Tela de Início"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configurações do PWA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Configurações do PWA</CardTitle>
          </div>
          <CardDescription>
            Personalize o comportamento do assistente de voz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Painel de Humanização de Voz */}
              <Collapsible open={showAdvancedVoice} onOpenChange={setShowAdvancedVoice}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-purple-500/30 hover:bg-purple-500/10 py-6"
                  >
                    <span className="flex items-center gap-2 text-base">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Configurações Avançadas de Voz e Textos
                    </span>
                    {showAdvancedVoice ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <VoiceHumanizationPanel />
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Timeout do Microfone */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Timeout do Microfone</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {config.micTimeoutSeconds}s
                  </span>
                </div>
                <Slider
                  value={[config.micTimeoutSeconds]}
                  onValueChange={([value]) => updateConfig("micTimeoutSeconds", value)}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span>30s</span>
                </div>
              </div>

              {/* Mostrar Contagem Regressiva */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Mostrar Contagem Regressiva</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe os últimos 5 segundos antes do timeout
                  </p>
                </div>
                <Switch
                  checked={config.enableCountdown}
                  onCheckedChange={(checked) => updateConfig("enableCountdown", checked)}
                />
              </div>

              <Separator />

              {/* Duração do Splash */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Duração do Splash Screen</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {config.splashDurationMs}ms
                  </span>
                </div>
                <Slider
                  value={[config.splashDurationMs]}
                  onValueChange={([value]) => updateConfig("splashDurationMs", value)}
                  min={1000}
                  max={5000}
                  step={500}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1s</span>
                  <span>5s</span>
                </div>
              </div>

              <Separator />

              {/* Botões de ação */}
              <div className="flex gap-3 pt-2">
                <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
                <Button variant="outline" onClick={resetToDefaults}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar Padrões
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
