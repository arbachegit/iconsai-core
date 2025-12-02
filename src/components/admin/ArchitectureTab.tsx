import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Server, Database, Cloud, Cpu, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ArchitectureTab = () => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">🏗️ Arquitetura de GPU</h2>
          <p className="text-muted-foreground mt-2">
            Infraestrutura AWS com Base Model + LoRA Adapters
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleZoomIn} variant="outline" size="icon">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={handleZoomOut} variant="outline" size="icon">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button onClick={handleReset} variant="outline" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Infographic */}
      <Card className="bg-gradient-to-br from-background to-background/50 border-primary/20">
        <CardContent className="p-6">
          <div
            className={`relative overflow-hidden rounded-lg bg-background/40 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ minHeight: '800px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              ref={svgRef}
              viewBox="0 0 1200 900"
              className="w-full h-full"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
            >
              {/* Animated Background Grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.1" />
                </pattern>
                
                {/* Glow Effects */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Arrow Markers */}
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" />
                </marker>
              </defs>

              <rect width="1200" height="900" fill="url(#grid)" />

              {/* Users Section */}
              <g id="users" className="group">
                <rect x="150" y="50" width="150" height="100" rx="10" fill="hsl(var(--primary) / 0.2)" 
                      stroke="hsl(var(--primary))" strokeWidth="2" className="transition-all hover:fill-[hsl(var(--primary)/0.3)]">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                </rect>
                <text x="225" y="85" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">👤 Usuário A</text>
                <text x="225" y="105" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Empresa A</text>
                <text x="225" y="125" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Request: Prompt</text>
                
                <rect x="400" y="50" width="150" height="100" rx="10" fill="hsl(var(--primary) / 0.2)" 
                      stroke="hsl(var(--primary))" strokeWidth="2" className="transition-all hover:fill-[hsl(var(--primary)/0.3)]">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" begin="0.5s" />
                </rect>
                <text x="475" y="85" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">👤 Usuário B</text>
                <text x="475" y="105" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Empresa B</text>
                <text x="475" y="125" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Request: Prompt</text>
              </g>

              {/* Arrows from Users to API Gateway */}
              <line x1="225" y1="150" x2="350" y2="210" stroke="hsl(var(--primary))" strokeWidth="3" 
                    markerEnd="url(#arrowhead)" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
              </line>
              <line x1="475" y1="150" x2="350" y2="210" stroke="hsl(var(--primary))" strokeWidth="3" 
                    markerEnd="url(#arrowhead)" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" begin="0.3s" />
              </line>

              {/* Data Flow Particles */}
              <circle r="4" fill="hsl(var(--primary))" filter="url(#glow)">
                <animateMotion dur="2s" repeatCount="indefinite" path="M225,150 L350,210" />
              </circle>
              <circle r="4" fill="hsl(var(--primary))" filter="url(#glow)">
                <animateMotion dur="2s" repeatCount="indefinite" begin="0.3s" path="M475,150 L350,210" />
              </circle>

              {/* API Gateway */}
              <g id="api-gateway">
                <rect x="200" y="220" width="300" height="80" rx="10" fill="hsl(var(--secondary) / 0.3)" 
                      stroke="hsl(var(--secondary))" strokeWidth="2" className="transition-all hover:fill-[hsl(var(--secondary)/0.4)]" />
                <text x="350" y="250" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">🌐 API Gateway / Load Balancer</text>
                <text x="350" y="270" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Entrada unificada</text>
                <text x="350" y="285" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Roteia requests para cluster</text>
              </g>

              {/* Arrow to Orchestrator */}
              <line x1="350" y1="300" x2="350" y2="360" stroke="hsl(var(--primary))" strokeWidth="3" 
                    markerEnd="url(#arrowhead)" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
              </line>
              <circle r="4" fill="hsl(var(--primary))" filter="url(#glow)">
                <animateMotion dur="1.5s" repeatCount="indefinite" path="M350,300 L350,360" />
              </circle>

              {/* Orchestrator (EKS/ECS) */}
              <g id="orchestrator">
                <rect x="200" y="370" width="300" height="80" rx="10" fill="hsl(var(--secondary) / 0.3)" 
                      stroke="hsl(var(--secondary))" strokeWidth="2" className="transition-all hover:fill-[hsl(var(--secondary)/0.4)]" />
                <text x="350" y="400" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">☸️ Orquestrador (EKS/ECS)</text>
                <text x="350" y="420" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Kubernetes gerencia pods</text>
                <text x="350" y="435" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Auto-scaling e load balancing</text>
              </g>

              {/* Arrow to GPU Cluster */}
              <line x1="350" y1="450" x2="350" y2="510" stroke="hsl(var(--primary))" strokeWidth="3" 
                    markerEnd="url(#arrowhead)" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
              </line>
              <circle r="4" fill="hsl(var(--primary))" filter="url(#glow)">
                <animateMotion dur="1.5s" repeatCount="indefinite" path="M350,450 L350,510" />
              </circle>

              {/* GPU Cluster - Main Container */}
              <g id="gpu-cluster">
                <rect x="100" y="520" width="500" height="280" rx="15" fill="hsl(var(--accent) / 0.2)" 
                      stroke="hsl(var(--accent))" strokeWidth="3" />
                <text x="350" y="545" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold">🖥️ Cluster de Inferência - GPU Nodes</text>

                {/* VRAM Container */}
                <rect x="120" y="560" width="460" height="220" rx="10" fill="hsl(var(--accent) / 0.15)" 
                      stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="4,4">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
                </rect>
                <text x="350" y="580" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">💾 VRAM (24GB - NVIDIA A10G)</text>

                {/* Base Model */}
                <rect x="140" y="595" width="420" height="60" rx="8" fill="hsl(var(--chart-1) / 0.3)" 
                      stroke="hsl(var(--chart-1))" strokeWidth="2">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                </rect>
                <text x="350" y="615" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">🧠 BASE MODEL (Llama-3-8B)</text>
                <text x="350" y="635" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">16GB VRAM | Compartilhado por todos</text>
                <text x="350" y="650" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Permanentemente carregado</text>

                {/* Adapter Slot */}
                <rect x="140" y="670" width="420" height="50" rx="8" fill="hsl(var(--chart-2) / 0.3)" 
                      stroke="hsl(var(--chart-2))" strokeWidth="2">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
                </rect>
                <text x="350" y="690" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="bold">🔌 Slot de Inferência + Adapter Ativo</text>
                <text x="350" y="708" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">~200MB | Troca dinâmica em milissegundos</text>

                {/* Inference Server */}
                <rect x="140" y="735" width="420" height="35" rx="8" fill="hsl(var(--chart-3) / 0.3)" 
                      stroke="hsl(var(--chart-3))" strokeWidth="2" />
                <text x="350" y="757" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="bold">⚡ Inference Server (vLLM / TGI)</text>
              </g>

              {/* Arrows to S3 Buckets */}
              <line x1="350" y1="800" x2="200" y2="850" stroke="hsl(var(--chart-4))" strokeWidth="2.5" 
                    markerEnd="url(#arrowhead)" strokeDasharray="3,3">
                <animate attributeName="stroke-dashoffset" values="0;-6" dur="1.5s" repeatCount="indefinite" />
              </line>
              <line x1="350" y1="800" x2="350" y2="850" stroke="hsl(var(--chart-4))" strokeWidth="2.5" 
                    markerEnd="url(#arrowhead)" strokeDasharray="3,3">
                <animate attributeName="stroke-dashoffset" values="0;-6" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
              </line>
              <line x1="350" y1="800" x2="500" y2="850" stroke="hsl(var(--chart-4))" strokeWidth="2.5" 
                    markerEnd="url(#arrowhead)" strokeDasharray="3,3">
                <animate attributeName="stroke-dashoffset" values="0;-6" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
              </line>

              {/* S3 Storage Buckets */}
              <g id="s3-storage">
                <rect x="50" y="820" width="150" height="70" rx="8" fill="hsl(var(--chart-4) / 0.2)" 
                      stroke="hsl(var(--chart-4))" strokeWidth="2" />
                <text x="125" y="845" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="bold">📦 S3 Bucket</text>
                <text x="125" y="860" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Adapter A</text>
                <text x="125" y="875" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">~100MB</text>

                <rect x="275" y="820" width="150" height="70" rx="8" fill="hsl(var(--chart-4) / 0.2)" 
                      stroke="hsl(var(--chart-4))" strokeWidth="2" />
                <text x="350" y="845" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="bold">📦 S3 Bucket</text>
                <text x="350" y="860" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Adapter B</text>
                <text x="350" y="875" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">~100MB</text>

                <rect x="500" y="820" width="150" height="70" rx="8" fill="hsl(var(--chart-4) / 0.2)" 
                      stroke="hsl(var(--chart-4))" strokeWidth="2" />
                <text x="575" y="845" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="bold">📦 S3 Bucket</text>
                <text x="575" y="860" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Base Model</text>
                <text x="575" y="875" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Weights</text>
              </g>

              {/* Legend */}
              <g id="legend" transform="translate(750, 50)">
                <rect x="0" y="0" width="400" height="200" rx="10" fill="hsl(var(--background) / 0.9)" 
                      stroke="hsl(var(--border))" strokeWidth="1.5" />
                <text x="20" y="30" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">📊 Legenda</text>
                
                <circle cx="30" cy="60" r="6" fill="hsl(var(--primary))" />
                <text x="50" y="65" fill="hsl(var(--muted-foreground))" fontSize="12">Fluxo de Requisições</text>

                <rect x="24" y="80" width="12" height="12" fill="hsl(var(--secondary) / 0.3)" stroke="hsl(var(--secondary))" />
                <text x="50" y="90" fill="hsl(var(--muted-foreground))" fontSize="12">Orquestração (Kubernetes)</text>

                <rect x="24" y="105" width="12" height="12" fill="hsl(var(--accent) / 0.2)" stroke="hsl(var(--accent))" />
                <text x="50" y="115" fill="hsl(var(--muted-foreground))" fontSize="12">Processamento GPU</text>

                <rect x="24" y="130" width="12" height="12" fill="hsl(var(--chart-4) / 0.2)" stroke="hsl(var(--chart-4))" />
                <text x="50" y="140" fill="hsl(var(--muted-foreground))" fontSize="12">Armazenamento S3</text>

                <text x="20" y="170" fill="hsl(var(--muted-foreground))" fontSize="11" fontStyle="italic">⚡ Carregamento dinâmico</text>
                <text x="20" y="185" fill="hsl(var(--muted-foreground))" fontSize="11" fontStyle="italic">de Adapters em milissegundos</text>
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Server Specs */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Especificação do Node</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">GPU:</span>
              <Badge variant="secondary">NVIDIA A10G (24GB VRAM)</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">vCPU:</span>
              <Badge variant="secondary">4 a 8 vCPUs</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">RAM:</span>
              <Badge variant="secondary">32GB Sistema</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Disk:</span>
              <Badge variant="secondary">SSD NVMe</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Instância:</span>
              <Badge className="bg-gradient-primary">g5.xlarge</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Cost Efficiency */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-chart-2" />
              <CardTitle className="text-lg">Custos AWS (US-East)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">On-Demand:</span>
              <Badge variant="outline">US$ 1,01/hora</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Spot:</span>
              <Badge variant="outline" className="border-chart-2 text-chart-2">US$ 0,30-0,50/hora</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mensal 24/7:</span>
              <Badge variant="outline">~US$ 730</Badge>
            </div>
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Economia:</span>
                <Badge className="bg-chart-2 text-primary-foreground">90% com LoRA compartilhado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: LoRA Strategy */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-chart-3" />
              <CardTitle className="text-lg">Estratégia LoRA</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">1 Base Model</span>
                <span className="text-xs text-muted-foreground">= Múltiplos clientes</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Adapter/empresa:</span>
                <Badge variant="outline">50-200MB</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Troca:</span>
                <Badge className="bg-chart-1">Milissegundos</Badge>
              </div>
            </div>
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Capacidade:</span>
                <Badge className="bg-gradient-primary">100 clientes em 1-2 servidores</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Technical Details */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <CardTitle>Vantagens da Arquitetura</CardTitle>
            <CardDescription className="ml-auto">Smart Engineering & Cost Optimization</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-semibold mb-1">Inferência Rápida</h4>
              <p className="text-sm text-muted-foreground">
                Latência ultra-baixa com vLLM e troca instantânea de adapters
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-chart-2/5 border border-chart-2/20">
              <div className="text-2xl mb-2">💰</div>
              <h4 className="font-semibold mb-1">Custo Eficiente</h4>
              <p className="text-sm text-muted-foreground">
                90% de economia compartilhando base model entre múltiplos clientes
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-chart-3/5 border border-chart-3/20">
              <div className="text-2xl mb-2">📈</div>
              <h4 className="font-semibold mb-1">Escalável</h4>
              <p className="text-sm text-muted-foreground">
                Auto-scaling horizontal com Kubernetes para atender demanda
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-chart-4/5 border border-chart-4/20">
              <div className="text-2xl mb-2">🔒</div>
              <h4 className="font-semibold mb-1">Isolamento</h4>
              <p className="text-sm text-muted-foreground">
                Adapters isolados por cliente garantem privacidade de dados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};