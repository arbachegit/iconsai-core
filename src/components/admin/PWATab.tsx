import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Smartphone, Copy, ExternalLink, CheckCircle, Mic, Volume2, Play, Pause, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
          <h2 className="text-2xl font-bold text-foreground">PWA de Voz - Economia</h2>
          <p className="text-muted-foreground">
            Aplicativo de voz para pessoas analfabetas
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
        <CardHeader>
          <CardTitle>Preview do PWA</CardTitle>
          <CardDescription>
            Simulação de como o aplicativo aparece no celular
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            {/* Simulação de celular */}
            <div className="w-[280px] h-[560px] bg-[#0a0a0a] rounded-[40px] border-4 border-gray-700 overflow-hidden shadow-2xl relative">
              {/* Status bar */}
              <div className="h-8 bg-[#0a0a0a] flex items-center justify-between px-6 pt-2">
                <span className="text-white text-xs font-medium">9:41</span>
                <div className="flex items-center gap-1 text-white text-xs">
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>
              
              {/* App content */}
              <div className="flex flex-col items-center justify-center h-[480px] px-6">
                {/* Logo/Título */}
                <div className="text-center mb-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Economista</h3>
                  <p className="text-gray-500 text-xs mt-1">Toque para falar</p>
                </div>
                
                {/* Botão principal */}
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                
                {/* Player de áudio (simulado) */}
                <div className="mt-10 w-full bg-gray-900 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white ml-0.5" />
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                      <div className="w-1/3 h-full bg-blue-500 rounded-full" />
                    </div>
                    <span className="text-gray-500 text-xs">0:12</span>
                  </div>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {['0.5x', '1x', '1.5x', '2x'].map(speed => (
                      <span 
                        key={speed} 
                        className={`px-2 py-0.5 rounded-full text-xs ${speed === '1x' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-500'}`}
                      >
                        {speed}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
            </div>
          </div>
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
