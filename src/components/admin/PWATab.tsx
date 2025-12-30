import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Smartphone, Copy, ExternalLink, CheckCircle, Mic, Loader2, Wifi, Battery } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PWASimulator } from "./PWASimulator";

interface AgentInfo {
  name: string;
  slug: string;
  is_active: boolean;
  rag_collection: string | null;
}

export default function PWATab() {
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  
  const pwaUrl = `${window.location.origin}/pwa`;
  
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

  return (
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

      {/* Preview do PWA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Preview do PWA</CardTitle>
            <CardDescription>
              {showSimulator ? "Simulador interativo do PWA" : "Simulação de como o aplicativo aparece no celular"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSimulator(!showSimulator)}
          >
            {showSimulator ? "Mostrar Estático" : "Abrir Simulador"}
          </Button>
        </CardHeader>
        <CardContent>
          {showSimulator ? (
            <div className="flex justify-center py-4">
              <PWASimulator showFrame={true} scale={0.55} />
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
  );
}
