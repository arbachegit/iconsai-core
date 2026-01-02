import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, Copy, ExternalLink, CheckCircle, Mic, Loader2, Wifi, Battery,
  Settings, Volume2, RotateCcw, Save, Play, Maximize2, X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PWASimulator } from "./PWASimulator";
import { useConfigPWA } from "@/hooks/useConfigPWA";

interface AgentInfo {
  name: string;
  slug: string;
  is_active: boolean;
  rag_collection: string | null;
}

const VOICE_OPTIONS = [
  { value: "fernando", label: "Fernando (PT-BR)", provider: "ElevenLabs" },
  { value: "alloy", label: "Alloy (Neutro)", provider: "OpenAI" },
  { value: "onyx", label: "Onyx (Grave)", provider: "OpenAI" },
  { value: "nova", label: "Nova (Feminino)", provider: "OpenAI" },
  { value: "shimmer", label: "Shimmer (Suave)", provider: "OpenAI" },
];

const ZOOM_STORAGE_KEY = 'pwaSimulatorZoomLevel';

export default function PWATab() {
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  
  // Fullscreen, zoom and landscape states
  const [simulatorScale, setSimulatorScale] = useState(() => {
    const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 1.5) {
        return parsed;
      }
    }
    return 0.9;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const { config, isLoading: configLoading, isSaving, updateConfig, saveConfig, resetToDefaults } = useConfigPWA();
  
  const pwaUrl = `${window.location.origin}/pwa`;

  // Persist zoom level to localStorage
  useEffect(() => {
    localStorage.setItem(ZOOM_STORAGE_KEY, simulatorScale.toString());
  }, [simulatorScale]);

  // Toggle fullscreen mode (internal overlay, not browser fullscreen)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const toggleLandscape = useCallback(() => {
    setIsLandscape(prev => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setSimulatorScale(prev => Math.min(prev + 0.1, 1.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setSimulatorScale(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setSimulatorScale(0.9);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC sempre sai do fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }
      
      if (!showSimulator) return;
      
      // Avoid conflict when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          toggleLandscape();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSimulator, isFullscreen, handleZoomIn, handleZoomOut, handleResetZoom, toggleFullscreen, toggleLandscape]);
  useEffect(() => {
    const fetchAgent = async () => {
      const { data } = await supabase
        .from("chat_agents")
        .select("name, slug, is_active, rag_collection")
        .eq("slug", "economia")
        .single();
      
      setAgent(data);
      setLoading(false);
    };
    
    fetchAgent();
  }, []);
  
  const copyLink = () => {
    navigator.clipboard.writeText(pwaUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };
  
  const openPWA = () => {
    window.open(pwaUrl, '_blank');
  };

  const testVoice = async () => {
    setTestingVoice(true);
    try {
      const testText = "Olá! Esta é uma demonstração da voz selecionada para o KnowYOU.";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: testText, voice: config.ttsVoice }),
        }
      );

      if (!response.ok) throw new Error("Erro ao gerar áudio");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      toast.success("Reproduzindo teste de voz...");
    } catch (err) {
      console.error("Erro ao testar voz:", err);
      toast.error("Erro ao testar voz");
    } finally {
      setTestingVoice(false);
    }
  };

  return (
    <>
      {/* === FULLSCREEN OVERLAY - Primeiro nível, fora de todos os cards === */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          {/* Hint para sair */}
          <div className="absolute top-4 right-4 z-10 text-white/50 text-sm flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white/10 rounded text-xs">ESC</kbd>
            <span>para sair</span>
          </div>
          
          {/* Botão X para sair (alternativa ao ESC) */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 text-white/50 hover:text-white hover:bg-white/10"
            onClick={toggleFullscreen}
          >
            <X className="h-5 w-5" />
          </Button>
          
          {/* PWA ocupando tudo - sem frame */}
          <div className="w-full h-full">
            <PWASimulator 
              showFrame={false}
              frameless={true}
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </div>
      )}

      {/* === CONTEÚDO NORMAL === */}
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
            <Smartphone className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">PWA de Voz - KnowYOU</h2>
            <p className="text-muted-foreground">
              Aplicativo de voz para assistência inteligente
            </p>
          </div>
        </div>

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
            <Button onClick={openPWA}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir
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
              {/* Texto de Boas-Vindas */}
              <div className="space-y-2">
                <Label htmlFor="welcome-text" className="text-base font-medium">
                  Texto de Boas-Vindas
                </Label>
                <Textarea
                  id="welcome-text"
                  value={config.welcomeText}
                  onChange={(e) => updateConfig("welcomeText", e.target.value)}
                  placeholder="Digite o texto de boas-vindas..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">[name]</code> para inserir o nome do usuário.
                  <span className="float-right">{config.welcomeText.length}/500</span>
                </p>
              </div>

              <Separator />

              {/* Voz TTS */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Voz TTS</Label>
                <div className="flex gap-2">
                  <Select
                    value={config.ttsVoice}
                    onValueChange={(value) => updateConfig("ttsVoice", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4" />
                            <span>{voice.label}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {voice.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={testVoice}
                    disabled={testingVoice}
                  >
                    {testingVoice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span className="ml-2">Testar</span>
                  </Button>
                </div>
              </div>

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

      {/* Preview do PWA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Preview do PWA</CardTitle>
            <CardDescription>
              {showSimulator ? "Simulador interativo do PWA" : "Simulação de como o aplicativo aparece no celular"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {showSimulator && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Tela Cheia
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
            >
              {showSimulator ? "Mostrar Estático" : "Abrir Simulador"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showSimulator ? (
            <div className="flex flex-col items-center justify-center py-4">
              <PWASimulator 
                showFrame={true}
                scale={simulatorScale}
                onScaleChange={setSimulatorScale}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                showControls={true}
                isLandscape={isLandscape}
                onToggleLandscape={toggleLandscape}
              />
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                {/* Simulação de celular */}
                <div className="w-[280px] h-[560px] bg-[#0a0a0a] rounded-[40px] border-4 border-gray-700 overflow-hidden shadow-2xl relative">
                  {/* Status bar */}
                  <div className="h-8 bg-[#0a0a0a] flex items-center justify-between px-6 pt-2">
                    <span className="text-white text-xs font-medium">9:41</span>
                    <div className="flex items-center gap-1 text-white text-xs">
                      <Wifi className="w-3 h-3" />
                      <Battery className="w-4 h-3" />
                    </div>
                  </div>
                  
                  {/* App content */}
                  <div className="flex flex-col items-center justify-center h-[480px] px-6">
                    {/* Logo/Título */}
                    <div className="text-center mb-10">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <span className="text-2xl">🎙️</span>
                      </div>
                      <h3 className="text-lg font-bold text-white">KnowYOU</h3>
                      <p className="text-gray-500 text-xs mt-1">Toque para falar</p>
                    </div>
                    
                    {/* Botão principal */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <Mic className="w-10 h-10 text-white" />
                    </div>
                    
                    {/* Módulos */}
                    <div className="mt-10 grid grid-cols-4 gap-3 w-full">
                      {["💡", "🌍", "❤️", "🎯"].map((emoji, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-gray-800/50 flex items-center justify-center text-xl">
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
                </div>
              </div>
              
              <p className="text-center text-xs text-muted-foreground mt-4">
                Clique em "Abrir Simulador" para testar o PWA interativamente.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status do Agente */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">Carregando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={agent?.is_active ? "default" : "destructive"} className="bg-green-500">
                  {agent?.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <span className="text-sm text-muted-foreground">Agente {agent?.name || "Economia"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-cyan-500 text-cyan-500">Whisper</Badge>
                <span className="text-sm text-muted-foreground">STT (OpenAI)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-purple-500 text-purple-500">ElevenLabs</Badge>
                <span className="text-sm text-muted-foreground">TTS (Voz)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-orange-500 text-orange-500">RAG</Badge>
                <span className="text-sm text-muted-foreground">{agent?.rag_collection || "economia"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
