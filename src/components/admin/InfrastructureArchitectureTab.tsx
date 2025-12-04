import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Server, 
  Database, 
  Cpu, 
  HardDrive,
  DollarSign,
  Layers,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const InfrastructureArchitectureTab = () => {
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);

  // Restart animations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleReset = () => setZoom(100);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gradient">Arquitetura KY AI SLM</h2>
            <p className="text-muted-foreground mt-1">
              Small Language Model Infrastructure - Base Model + LoRA Adapters
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
                viewBox="0 0 900 700" 
                className="w-full h-auto min-h-[600px]"
                style={{ minWidth: '800px' }}
              >
                {/* Definitions */}
                <defs>
                  {/* Animated gradient for data flow */}
                  <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                  
                  {/* Glow filter */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>

                  {/* Pulse animation */}
                  <animate id="pulse" attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                </defs>

                {/* Animated Background Grid */}
                <g opacity="0.1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <line 
                      key={`v-${i}`} 
                      x1={i * 45} 
                      y1="0" 
                      x2={i * 45} 
                      y2="700" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="0.5"
                    >
                      <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
                    </line>
                  ))}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <line 
                      key={`h-${i}`} 
                      x1="0" 
                      y1={i * 45} 
                      x2="900" 
                      y2={i * 45} 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="0.5"
                    >
                      <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.15}s`} repeatCount="indefinite" />
                    </line>
                  ))}
                </g>

                {/* ===== USERS SECTION (Purple) ===== */}
                <g>
                  {/* User A */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g className="cursor-pointer">
                        <rect x="200" y="30" width="140" height="50" rx="8" fill="hsl(271 91% 65% / 0.2)" stroke="hsl(271 91% 65%)" strokeWidth="2">
                          <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
                        </rect>
                        <text x="270" y="60" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="14" fontWeight="600">Empresa A</text>
                      </g>
                    </TooltipTrigger>
                  </Tooltip>

                  {/* User B */}
                  <g className="cursor-pointer">
                    <rect x="560" y="30" width="140" height="50" rx="8" fill="hsl(271 91% 65% / 0.2)" stroke="hsl(271 91% 65%)" strokeWidth="2">
                      <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" begin="0.5s" />
                    </rect>
                    <text x="630" y="60" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="14" fontWeight="600">Empresa B</text>
                  </g>
                </g>

                {/* ===== ARROWS FROM USERS TO API ===== */}
                <g>
                  {/* Arrow from User A */}
                  <path d="M270 80 L270 110 L450 110 L450 130" fill="none" stroke="hsl(271 91% 65%)" strokeWidth="2" strokeDasharray="5,5">
                    <animate attributeName="stroke-dashoffset" values="10;0" dur="1s" repeatCount="indefinite" />
                  </path>
                  {/* Arrow from User B */}
                  <path d="M630 80 L630 110 L450 110 L450 130" fill="none" stroke="hsl(271 91% 65%)" strokeWidth="2" strokeDasharray="5,5">
                    <animate attributeName="stroke-dashoffset" values="10;0" dur="1s" repeatCount="indefinite" begin="0.3s" />
                  </path>
                  
                  {/* Data packets flowing */}
                  <circle r="4" fill="hsl(271 91% 65%)">
                    <animateMotion dur="2s" repeatCount="indefinite" path="M270 80 L270 110 L450 110 L450 130" />
                  </circle>
                  <circle r="4" fill="hsl(271 91% 65%)">
                    <animateMotion dur="2s" repeatCount="indefinite" begin="1s" path="M630 80 L630 110 L450 110 L450 130" />
                  </circle>
                </g>

                {/* ===== API GATEWAY (Blue) ===== */}
                <g className="cursor-pointer">
                  <rect x="300" y="130" width="300" height="60" rx="10" fill="hsl(217 91% 60% / 0.2)" stroke="hsl(217 91% 60%)" strokeWidth="2" />
                  <text x="450" y="155" textAnchor="middle" fill="hsl(217 91% 60%)" fontSize="16" fontWeight="700">API Gateway</text>
                  <text x="450" y="175" textAnchor="middle" fill="hsl(217 91% 60% / 0.7)" fontSize="12">Load Balancer</text>
                </g>

                {/* Arrow to Orchestrator */}
                <path d="M450 190 L450 220" fill="none" stroke="hsl(217 91% 60%)" strokeWidth="2" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" />
                </path>
                <circle r="4" fill="hsl(217 91% 60%)">
                  <animateMotion dur="1s" repeatCount="indefinite" path="M450 190 L450 220" />
                </circle>

                {/* ===== ORCHESTRATOR (Blue) ===== */}
                <g className="cursor-pointer">
                  <rect x="300" y="220" width="300" height="60" rx="10" fill="hsl(217 91% 60% / 0.2)" stroke="hsl(217 91% 60%)" strokeWidth="2" />
                  <text x="450" y="245" textAnchor="middle" fill="hsl(217 91% 60%)" fontSize="16" fontWeight="700">Orquestrador</text>
                  <text x="450" y="265" textAnchor="middle" fill="hsl(217 91% 60% / 0.7)" fontSize="12">Kubernetes EKS / ECS</text>
                </g>

                {/* Arrow to GPU Cluster */}
                <path d="M450 280 L450 310" fill="none" stroke="hsl(142 76% 36%)" strokeWidth="2" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" />
                </path>
                <circle r="4" fill="hsl(142 76% 36%)">
                  <animateMotion dur="1s" repeatCount="indefinite" path="M450 280 L450 310" />
                </circle>

                {/* ===== GPU CLUSTER (Green) ===== */}
                <g>
                  {/* Main container */}
                  <rect x="100" y="310" width="700" height="230" rx="12" fill="hsl(142 76% 36% / 0.1)" stroke="hsl(142 76% 36%)" strokeWidth="2" />
                  <text x="450" y="335" textAnchor="middle" fill="hsl(142 76% 36%)" fontSize="14" fontWeight="700">CLUSTER DE INFERÊNCIA GPU NODES - AWS g5.xlarge</text>

                  {/* VRAM Container (Cyan) */}
                  <rect x="130" y="350" width="640" height="130" rx="8" fill="hsl(187 96% 42% / 0.15)" stroke="hsl(187 96% 42%)" strokeWidth="1.5" />
                  <text x="450" y="370" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="12" fontWeight="600">VRAM - 24GB (NVIDIA A10G)</text>

                  {/* BASE MODEL - Pulsing */}
                  <g filter="url(#glow)">
                    <rect x="160" y="385" width="350" height="80" rx="6" fill="hsl(187 96% 42% / 0.25)" stroke="hsl(187 96% 42%)" strokeWidth="2">
                      <animate attributeName="stroke-width" values="2;4;2" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                    </rect>
                    <text x="335" y="415" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="16" fontWeight="700">BASE MODEL</text>
                    <text x="335" y="435" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="13">Llama-3-8B - 16GB VRAM</text>
                    <text x="335" y="455" textAnchor="middle" fill="hsl(187 96% 42% / 0.7)" fontSize="11">Carregado 1x - Compartilhado</text>
                  </g>

                  {/* Inference Slots */}
                  <g>
                    {/* Slot A - Animated loading */}
                    <rect x="540" y="385" width="100" height="35" rx="4" fill="hsl(271 91% 65% / 0.3)" stroke="hsl(271 91% 65%)" strokeWidth="1.5">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
                    </rect>
                    <text x="590" y="408" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="11" fontWeight="600">Slot A</text>

                    {/* Slot B - Animated loading */}
                    <rect x="540" y="430" width="100" height="35" rx="4" fill="hsl(271 91% 65% / 0.3)" stroke="hsl(271 91% 65%)" strokeWidth="1.5">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" begin="1.5s" />
                    </rect>
                    <text x="590" y="453" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="11" fontWeight="600">Slot B</text>
                  </g>

                  {/* Inference Server */}
                  <rect x="130" y="490" width="640" height="40" rx="6" fill="hsl(142 76% 36% / 0.2)" stroke="hsl(142 76% 36%)" strokeWidth="1.5" />
                  <text x="450" y="515" textAnchor="middle" fill="hsl(142 76% 36%)" fontSize="13" fontWeight="600">Inference Server (vLLM / TGI / LoRAX)</text>
                </g>

                {/* ===== BIDIRECTIONAL ARROWS TO S3 ===== */}
                <g>
                  <path d="M450 540 L450 570" fill="none" stroke="hsl(25 95% 53%)" strokeWidth="2" strokeDasharray="5,5">
                    <animate attributeName="stroke-dashoffset" values="10;0" dur="0.5s" repeatCount="indefinite" />
                  </path>
                  <path d="M430 555 L450 540 L470 555" fill="none" stroke="hsl(25 95% 53%)" strokeWidth="2" />
                  <path d="M430 555 L450 570 L470 555" fill="none" stroke="hsl(25 95% 53%)" strokeWidth="2" />
                  
                  {/* Dynamic loading indicator */}
                  <circle r="3" fill="hsl(25 95% 53%)">
                    <animateMotion dur="0.8s" repeatCount="indefinite" path="M450 540 L450 570" />
                  </circle>
                  <circle r="3" fill="hsl(25 95% 53%)">
                    <animateMotion dur="0.8s" repeatCount="indefinite" begin="0.4s" path="M450 570 L450 540" />
                  </circle>
                  
                  <text x="520" y="558" fill="hsl(25 95% 53% / 0.8)" fontSize="10">Carregamento Dinâmico</text>
                </g>

                {/* ===== S3 STORAGE (Orange) ===== */}
                <g>
                  <rect x="100" y="580" width="700" height="100" rx="12" fill="hsl(25 95% 53% / 0.1)" stroke="hsl(25 95% 53%)" strokeWidth="2" />
                  <text x="450" y="605" textAnchor="middle" fill="hsl(25 95% 53%)" fontSize="14" fontWeight="700">ARMAZENAMENTO S3</text>

                  {/* Adapter A */}
                  <rect x="150" y="620" width="150" height="45" rx="6" fill="hsl(271 91% 65% / 0.2)" stroke="hsl(271 91% 65%)" strokeWidth="1.5">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
                  </rect>
                  <text x="225" y="640" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="12" fontWeight="600">Adapter Empresa A</text>
                  <text x="225" y="656" textAnchor="middle" fill="hsl(271 91% 65% / 0.7)" fontSize="10">~100MB (LoRA)</text>

                  {/* Adapter B */}
                  <rect x="375" y="620" width="150" height="45" rx="6" fill="hsl(271 91% 65% / 0.2)" stroke="hsl(271 91% 65%)" strokeWidth="1.5">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" begin="2s" />
                  </rect>
                  <text x="450" y="640" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="12" fontWeight="600">Adapter Empresa B</text>
                  <text x="450" y="656" textAnchor="middle" fill="hsl(271 91% 65% / 0.7)" fontSize="10">~100MB (LoRA)</text>

                  {/* Base Model Weights */}
                  <rect x="600" y="620" width="150" height="45" rx="6" fill="hsl(187 96% 42% / 0.2)" stroke="hsl(187 96% 42%)" strokeWidth="1.5" />
                  <text x="675" y="640" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="12" fontWeight="600">Base Model</text>
                  <text x="675" y="656" textAnchor="middle" fill="hsl(187 96% 42% / 0.7)" fontSize="10">Weights (~16GB)</text>
                </g>

                {/* Legend */}
                <g transform="translate(720, 30)">
                  <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">Legenda:</text>
                  <rect x="0" y="10" width="12" height="12" fill="hsl(271 91% 65% / 0.3)" stroke="hsl(271 91% 65%)" strokeWidth="1" rx="2" />
                  <text x="18" y="20" fill="hsl(var(--muted-foreground))" fontSize="10">Clientes</text>
                  <rect x="0" y="28" width="12" height="12" fill="hsl(217 91% 60% / 0.3)" stroke="hsl(217 91% 60%)" strokeWidth="1" rx="2" />
                  <text x="18" y="38" fill="hsl(var(--muted-foreground))" fontSize="10">Orquestração</text>
                  <rect x="0" y="46" width="12" height="12" fill="hsl(142 76% 36% / 0.3)" stroke="hsl(142 76% 36%)" strokeWidth="1" rx="2" />
                  <text x="18" y="56" fill="hsl(var(--muted-foreground))" fontSize="10">GPU</text>
                  <rect x="0" y="64" width="12" height="12" fill="hsl(187 96% 42% / 0.3)" stroke="hsl(187 96% 42%)" strokeWidth="1" rx="2" />
                  <text x="18" y="74" fill="hsl(var(--muted-foreground))" fontSize="10">VRAM</text>
                  <rect x="0" y="82" width="12" height="12" fill="hsl(25 95% 53% / 0.3)" stroke="hsl(25 95% 53%)" strokeWidth="1" rx="2" />
                  <text x="18" y="92" fill="hsl(var(--muted-foreground))" fontSize="10">Storage</text>
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Specifications Card */}
          <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-cyan-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-cyan-400">
                <Server className="h-4 w-4" />
                Especificações de Hardware
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPU:</span>
                <span className="font-mono text-cyan-300">NVIDIA A10G (24GB)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">vCPU:</span>
                <span className="font-mono text-cyan-300">4-8 cores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RAM Sistema:</span>
                <span className="font-mono text-cyan-300">32GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disco:</span>
                <span className="font-mono text-cyan-300">SSD NVMe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instância AWS:</span>
                <span className="font-mono text-cyan-300">g5.xlarge</span>
              </div>
            </CardContent>
          </Card>

          {/* Costs Card */}
          <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
                <DollarSign className="h-4 w-4" />
                Custos AWS (On-Demand)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">g5.xlarge:</span>
                <span className="font-mono text-orange-300">~US$ 730/mês</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">g4dn.xlarge:</span>
                <span className="font-mono text-orange-300">~US$ 380/mês</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">g5.12xlarge:</span>
                <span className="font-mono text-orange-300">~US$ 5.800/mês</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-orange-500/20">
                <span className="text-muted-foreground">Spot Instance:</span>
                <span className="font-mono text-green-400">até 70% economia</span>
              </div>
            </CardContent>
          </Card>

          {/* LoRA Strategy Card */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
                <Layers className="h-4 w-4" />
                Estratégia LoRA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Model:</span>
                <span className="font-mono text-purple-300">1x carregado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adapter/empresa:</span>
                <span className="font-mono text-purple-300">50-200MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carregamento:</span>
                <span className="font-mono text-purple-300">~milissegundos</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                <span className="text-muted-foreground">Economia infra:</span>
                <span className="font-mono text-green-400 font-bold">até 90%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flow Explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Fluxo de Requisição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
              {[
                { step: "1", title: "Requisição", desc: "company_id: A", color: "purple" },
                { step: "2", title: "Verificação", desc: "Adapter na GPU?", color: "blue" },
                { step: "3", title: "Carregamento", desc: "S3 → GPU (~ms)", color: "orange" },
                { step: "4", title: "Inferência", desc: "Base + Adapter", color: "cyan" },
                { step: "5", title: "Resposta", desc: "Dados isolados", color: "green" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold
                    ${item.color === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : ''}
                    ${item.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : ''}
                    ${item.color === 'orange' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : ''}
                    ${item.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : ''}
                    ${item.color === 'green' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : ''}
                  `}>
                    {item.step}
                  </div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  {i < 4 && (
                    <div className="hidden md:block absolute top-5 -right-2 text-muted-foreground">→</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
