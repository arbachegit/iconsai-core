import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export const SaasRagArchitectureDiagram = () => {
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);

  // Restart animations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleReset = () => setZoom(100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Arquitetura SaaS RAG Customizado</h2>
          <p className="text-muted-foreground mt-1">
            Modelo Base Central + RAG Adapters por Empresa - Modularidade e Customização
          </p>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Architecture SVG */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div 
            className="relative overflow-auto"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <svg 
              key={animationKey}
              width="1000" 
              height="700" 
              viewBox="0 0 1000 700" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto min-h-[600px]"
              style={{ minWidth: '900px' }}
            >
              {/* Background */}
              <rect x="50" y="50" width="900" height="600" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))"/>

              {/* Animated Background Grid */}
              <g opacity="0.1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <line 
                    key={`v-${i}`} 
                    x1={50 + i * 45} 
                    y1="50" 
                    x2={50 + i * 45} 
                    y2="650" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="0.5"
                  >
                    <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
                  </line>
                ))}
                {Array.from({ length: 14 }).map((_, i) => (
                  <line 
                    key={`h-${i}`} 
                    x1="50" 
                    y1={50 + i * 45} 
                    x2="950" 
                    y2={50 + i * 45} 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="0.5"
                  >
                    <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.15}s`} repeatCount="indefinite" />
                  </line>
                ))}
              </g>

              {/* Defs for markers and filters */}
              <defs>
                <marker id="arrowhead-orange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="hsl(38 92% 50%)" />
                </marker>
                <filter id="glow-saas" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* ===== EMPRESA A (Purple) ===== */}
              <g>
                <rect x="100" y="100" width="150" height="50" rx="8" fill="hsl(271 81% 46%)">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
                </rect>
                <text x="175" y="130" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Empresa A</text>
              </g>

              {/* ===== EMPRESA B (Green) ===== */}
              <g>
                <rect x="750" y="100" width="150" height="50" rx="8" fill="hsl(158 64% 32%)">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="1.5s" />
                </rect>
                <text x="825" y="130" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Empresa B</text>
              </g>

              {/* ===== RAG ADAPTER A (Purple) ===== */}
              <g filter="url(#glow-saas)">
                <rect x="100" y="250" width="200" height="70" rx="8" fill="hsl(271 91% 55% / 0.3)" stroke="hsl(271 91% 65%)" strokeWidth="2">
                  <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                </rect>
                <text x="200" y="280" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="14" fontWeight="600">RAG Adaptador A</text>
                <text x="200" y="300" textAnchor="middle" fill="hsl(271 91% 65% / 0.7)" fontSize="11">(Conhecimento Customizado)</text>
              </g>

              {/* ===== RAG ADAPTER B (Green) ===== */}
              <g filter="url(#glow-saas)">
                <rect x="700" y="250" width="200" height="70" rx="8" fill="hsl(158 64% 45% / 0.3)" stroke="hsl(158 76% 50%)" strokeWidth="2">
                  <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="1s" />
                </rect>
                <text x="800" y="280" textAnchor="middle" fill="hsl(158 76% 50%)" fontSize="14" fontWeight="600">RAG Adaptador B</text>
                <text x="800" y="300" textAnchor="middle" fill="hsl(158 76% 50% / 0.7)" fontSize="11">(Conhecimento Customizado)</text>
              </g>

              {/* ===== ARMAZENAMENTO VETORIZADO (Orange) ===== */}
              <g filter="url(#glow-saas)">
                <rect x="350" y="400" width="300" height="80" rx="10" fill="hsl(38 92% 50% / 0.25)" stroke="hsl(45 93% 58%)" strokeWidth="2">
                  <animate attributeName="stroke-width" values="2;3;2" dur="3s" repeatCount="indefinite" />
                </rect>
                <text x="500" y="435" textAnchor="middle" fill="hsl(38 92% 50%)" fontSize="16" fontWeight="700">ARMAZENAMENTO VETORIZADO</text>
                <text x="500" y="460" textAnchor="middle" fill="hsl(38 92% 50% / 0.8)" fontSize="12">(Fonte Unificada de RAGs)</text>
              </g>

              {/* ===== SLM BASE MODEL (Blue) - Pulsing ===== */}
              <g filter="url(#glow-saas)">
                <rect x="200" y="550" width="600" height="90" rx="12" fill="hsl(217 91% 44% / 0.3)" stroke="hsl(217 91% 60%)" strokeWidth="3">
                  <animate attributeName="stroke-width" values="3;6;3" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="stroke" values="hsl(217 91% 60%);hsl(217 91% 75%);hsl(217 91% 60%)" dur="4s" repeatCount="indefinite" />
                </rect>
                <text x="500" y="585" textAnchor="middle" fill="hsl(217 91% 60%)" fontSize="22" fontWeight="700">SLM (Modelo Base Central)</text>
                <text x="500" y="615" textAnchor="middle" fill="hsl(217 91% 60% / 0.8)" fontSize="13">Modularidade • Latência Ultra-Baixa • 0% Alucinação</text>
              </g>

              {/* ===== ARROWS: Empresa A -> RAG A ===== */}
              <path 
                d="M175 150 L175 180 L200 180 L200 250" 
                fill="none" 
                stroke="hsl(271 91% 65% / 0.6)" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              >
                <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" />
              </path>

              {/* ===== ARROWS: Empresa B -> RAG B ===== */}
              <path 
                d="M825 150 L825 180 L800 180 L800 250" 
                fill="none" 
                stroke="hsl(158 76% 50% / 0.6)" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              >
                <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" begin="1s" />
              </path>

              {/* ===== ARROWS: RAG A -> Armazenamento ===== */}
              <path 
                d="M200 320 L200 360 L350 360 L350 400" 
                fill="none" 
                stroke="hsl(38 92% 50% / 0.6)" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              >
                <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" begin="0.5s" />
              </path>

              {/* ===== ARROWS: RAG B -> Armazenamento ===== */}
              <path 
                d="M800 320 L800 360 L650 360 L650 400" 
                fill="none" 
                stroke="hsl(38 92% 50% / 0.6)" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              >
                <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" begin="1.5s" />
              </path>

              {/* ===== ARROW: Armazenamento -> SLM Base ===== */}
              <line x1="500" y1="480" x2="500" y2="550" stroke="hsl(38 92% 50%)" strokeWidth="3" markerEnd="url(#arrowhead-orange)">
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
              </line>

              {/* ===== ANIMATED DATA DOTS - Flow A ===== */}
              {/* Dot 1: Empresa A -> RAG A -> Armazenamento */}
              <circle r="8" fill="hsl(0 87% 82%)" filter="url(#glow-saas)">
                <animateMotion 
                  dur="4s" 
                  repeatCount="indefinite"
                  path="M175,150 L175,180 L200,180 L200,285 L200,320 L200,360 L350,360 L350,400 L500,440"
                  begin="0s"
                />
                <animate attributeName="opacity" values="0;1;1;1;0" dur="4s" repeatCount="indefinite" begin="0s" />
              </circle>

              {/* Dot 2: Empresa A -> RAG A -> Armazenamento (delayed) */}
              <circle r="8" fill="hsl(0 87% 82%)" filter="url(#glow-saas)">
                <animateMotion 
                  dur="4s" 
                  repeatCount="indefinite"
                  path="M175,150 L175,180 L200,180 L200,285 L200,320 L200,360 L350,360 L350,400 L500,440"
                  begin="2s"
                />
                <animate attributeName="opacity" values="0;1;1;1;0" dur="4s" repeatCount="indefinite" begin="2s" />
              </circle>

              {/* ===== ANIMATED DATA DOTS - Flow B ===== */}
              {/* Dot 1: Empresa B -> RAG B -> Armazenamento */}
              <circle r="8" fill="hsl(0 87% 82%)" filter="url(#glow-saas)">
                <animateMotion 
                  dur="4s" 
                  repeatCount="indefinite"
                  path="M825,150 L825,180 L800,180 L800,285 L800,320 L800,360 L650,360 L650,400 L500,440"
                  begin="1s"
                />
                <animate attributeName="opacity" values="0;1;1;1;0" dur="4s" repeatCount="indefinite" begin="1s" />
              </circle>

              {/* Dot 2: Empresa B -> RAG B -> Armazenamento (delayed) */}
              <circle r="8" fill="hsl(0 87% 82%)" filter="url(#glow-saas)">
                <animateMotion 
                  dur="4s" 
                  repeatCount="indefinite"
                  path="M825,150 L825,180 L800,180 L800,285 L800,320 L800,360 L650,360 L650,400 L500,440"
                  begin="3s"
                />
                <animate attributeName="opacity" values="0;1;1;1;0" dur="4s" repeatCount="indefinite" begin="3s" />
              </circle>

              {/* ===== LEGEND ===== */}
              <g transform="translate(70, 520)">
                <rect width="120" height="120" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                <text x="10" y="20" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">Legenda</text>
                
                <rect x="10" y="30" width="16" height="10" rx="2" fill="hsl(271 81% 46%)" />
                <text x="32" y="39" fill="hsl(var(--muted-foreground))" fontSize="9">Empresas</text>
                
                <rect x="10" y="48" width="16" height="10" rx="2" fill="hsl(271 91% 55% / 0.5)" stroke="hsl(271 91% 65%)" strokeWidth="1" />
                <text x="32" y="57" fill="hsl(var(--muted-foreground))" fontSize="9">RAG Adapters</text>
                
                <rect x="10" y="66" width="16" height="10" rx="2" fill="hsl(38 92% 50% / 0.3)" stroke="hsl(45 93% 58%)" strokeWidth="1" />
                <text x="32" y="75" fill="hsl(var(--muted-foreground))" fontSize="9">Armazenamento</text>
                
                <rect x="10" y="84" width="16" height="10" rx="2" fill="hsl(217 91% 44% / 0.3)" stroke="hsl(217 91% 60%)" strokeWidth="1" />
                <text x="32" y="93" fill="hsl(var(--muted-foreground))" fontSize="9">SLM Base</text>
                
                <circle cx="18" cy="110" r="5" fill="hsl(0 87% 82%)" />
                <text x="32" y="113" fill="hsl(var(--muted-foreground))" fontSize="9">Fluxo de Dados</text>
              </g>

            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-purple-400 mb-2">Customização por Empresa</h4>
            <p className="text-sm text-muted-foreground">
              Cada empresa possui seu próprio RAG Adapter com conhecimento específico, 
              garantindo respostas personalizadas sem contaminar outras bases.
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-orange-400 mb-2">Armazenamento Unificado</h4>
            <p className="text-sm text-muted-foreground">
              Vetores de todas as empresas são armazenados de forma isolada mas unificada, 
              permitindo consultas eficientes com isolamento de dados.
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-blue-400 mb-2">Modelo Base Central</h4>
            <p className="text-sm text-muted-foreground">
              SLM compartilhado processa todas as requisições com modularidade, 
              baixa latência e zero alucinação através dos adapters customizados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaasRagArchitectureDiagram;
