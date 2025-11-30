import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface FlowNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  icon: string;
  color: string;
  steps: string[];
  tooltip: string;
  gradientId: string;
}

const FlowNode = ({ x, y, width, height, title, icon, color, steps, tooltip, gradientId }: FlowNodeProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <g className="cursor-pointer hover:opacity-90 transition-opacity">
            {/* Sombra */}
            <rect
              x={x + 4}
              y={y + 4}
              width={width}
              height={height}
              rx="12"
              fill="black"
              opacity="0.15"
              filter="blur(8px)"
            />
            
            {/* Background com gradiente */}
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx="12"
              fill={`url(#${gradientId})`}
              stroke={color}
              strokeWidth="3"
            />
            
            {/* Ícone */}
            <text
              x={x + width / 2}
              y={y + 35}
              textAnchor="middle"
              fontSize="28"
            >
              {icon}
            </text>
            
            {/* Título */}
            <text
              x={x + width / 2}
              y={y + 65}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="18"
              fontWeight="bold"
            >
              {title}
            </text>
            
            {/* Steps */}
            {steps.map((step, idx) => (
              <g key={idx}>
                {/* Bullet point */}
                <circle
                  cx={x + 25}
                  cy={y + 95 + idx * 25}
                  r="4"
                  fill={color}
                />
                
                {/* Step text */}
                <text
                  x={x + 35}
                  y={y + 100 + idx * 25}
                  fill="hsl(var(--muted-foreground))"
                  fontSize="13"
                  fontWeight="500"
                >
                  {step}
                </text>
              </g>
            ))}
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface AnimatedArrowProps {
  d: string;
  color: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  tooltip: string;
}

const AnimatedArrow = ({ d, color, label, labelX, labelY, tooltip }: AnimatedArrowProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <g className="cursor-pointer">
            {/* Arrow path */}
            <path
              d={d}
              stroke={color}
              strokeWidth="3"
              fill="none"
              strokeDasharray="8 4"
              markerEnd="url(#arrowhead)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="12"
                to="0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </path>
            
            {/* Label background */}
            {label && labelX && labelY && (
              <>
                <rect
                  x={labelX - 40}
                  y={labelY - 12}
                  width="80"
                  height="24"
                  rx="12"
                  fill={color}
                  opacity="0.9"
                />
                <text
                  x={labelX}
                  y={labelY + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {label}
                </text>
              </>
            )}
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const RagFlowDiagram = () => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border">
        <Button size="sm" variant="ghost" onClick={handleZoomOut} title="Diminuir zoom">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleResetZoom} title="Resetar zoom">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleZoomIn} title="Aumentar zoom">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="flex items-center px-2 text-xs font-medium text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* SVG Container */}
      <div className="overflow-auto bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border p-4">
        <svg
          viewBox="0 0 1200 700"
          className="w-full h-auto transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          {/* Gradients */}
          <defs>
            {/* ETL Gradient */}
            <linearGradient id="etlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Database Gradient */}
            <radialGradient id="dbGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.1" />
            </radialGradient>
            
            {/* Retrieval Gradient */}
            <linearGradient id="retrievalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Generation Gradient */}
            <linearGradient id="generationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Arrow marker */}
            <marker
              id="arrowhead"
              markerWidth="12"
              markerHeight="12"
              refX="11"
              refY="6"
              orient="auto"
            >
              <polygon
                points="0 0, 12 6, 0 12"
                fill="hsl(var(--primary))"
              />
            </marker>
          </defs>

          {/* Background Grid */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
          <rect width="1200" height="700" fill="url(#grid)" />

          {/* Phase 1: ETL */}
          <FlowNode
            x={50}
            y={80}
            width={250}
            height={250}
            title="Fase 1: ETL"
            icon="📥"
            color="hsl(var(--primary))"
            gradientId="etlGradient"
            steps={[
              "1. Upload PDF",
              "2. Extração pdfjs-dist",
              "3. Validação Unicode",
              "4. Análise SLM Legibilidade",
              "5. Chunking (1500 palavras)",
              "6. OpenAI Embeddings"
            ]}
            tooltip="Fase de extração, transformação e carregamento. PDFs são processados, validados e convertidos em chunks com embeddings vetoriais."
          />

          {/* Arrow ETL to Database */}
          <AnimatedArrow
            d="M 300 205 L 450 340"
            color="hsl(var(--primary))"
            label="INSERT"
            labelX={375}
            labelY={270}
            tooltip="Os chunks processados e seus embeddings são inseridos no banco de dados PostgreSQL com extensão pgvector."
          />

          {/* Phase 2: Database */}
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <g className="cursor-pointer hover:opacity-90 transition-opacity">
                  {/* Database shadow */}
                  <ellipse
                    cx="554"
                    cy="404"
                    rx="130"
                    ry="80"
                    fill="black"
                    opacity="0.15"
                    filter="blur(8px)"
                  />
                  
                  {/* Database body */}
                  <ellipse
                    cx="550"
                    cy="400"
                    rx="130"
                    ry="80"
                    fill="url(#dbGradient)"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="3"
                  />
                  
                  {/* Database layers */}
                  <ellipse
                    cx="550"
                    cy="380"
                    rx="130"
                    ry="20"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  <ellipse
                    cx="550"
                    cy="400"
                    rx="130"
                    ry="20"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  
                  {/* Icon */}
                  <text
                    x="550"
                    y="390"
                    textAnchor="middle"
                    fontSize="24"
                  >
                    🗄️
                  </text>
                  
                  {/* Title */}
                  <text
                    x="550"
                    y="420"
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="18"
                    fontWeight="bold"
                  >
                    PostgreSQL + pgvector
                  </text>
                  
                  {/* Subtitle */}
                  <text
                    x="550"
                    y="440"
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize="13"
                  >
                    VECTOR(1536) Embeddings
                  </text>
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                <p className="font-semibold mb-1">PostgreSQL + pgvector</p>
                <p className="text-xs">
                  Banco de dados com extensão pgvector para armazenamento de embeddings vetoriais.
                  Permite buscas por similaridade semântica usando distância cosseno.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Arrow Database to Retrieval */}
          <AnimatedArrow
            d="M 650 340 L 800 205"
            color="hsl(var(--accent))"
            label="SEARCH"
            labelX={725}
            labelY={270}
            tooltip="Query do usuário é convertida em embedding e buscada no banco usando similaridade vetorial ou keywords."
          />

          {/* Phase 3: Retrieval */}
          <FlowNode
            x={800}
            y={80}
            width={250}
            height={250}
            title="Fase 2: Retrieval"
            icon="🔍"
            color="hsl(var(--accent))"
            gradientId="retrievalGradient"
            steps={[
              "1. Query Embedding",
              "2. Busca Híbrida:",
              "   • Vector (threshold 0.15)",
              "   • Keyword Fallback",
              "3. Top-K Chunks (5)",
              "4. Reranking por Score"
            ]}
            tooltip="Fase de recuperação de contexto relevante. Query é convertida em embedding e comparada com chunks armazenados usando busca vetorial ou keywords."
          />

          {/* Arrow Retrieval to Generation */}
          <AnimatedArrow
            d="M 925 330 L 925 460"
            color="#10b981"
            label="CONTEXT"
            labelX={970}
            labelY={395}
            tooltip="Chunks recuperados são enviados como contexto para o modelo de linguagem gerar a resposta."
          />

          {/* Phase 4: Generation */}
          <FlowNode
            x={800}
            y={460}
            width={250}
            height={180}
            title="Fase 3: Generation"
            icon="🤖"
            color="#10b981"
            gradientId="generationGradient"
            steps={[
              "1. Contexto RAG + Query",
              "2. System Prompt + Scope",
              "3. LLM (Gemini/GPT)",
              "4. Resposta Fundamentada"
            ]}
            tooltip="Fase de geração de resposta. LLM recebe o contexto recuperado e gera uma resposta baseada nos documentos, respeitando o escopo definido."
          />

          {/* Metadata boxes */}
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <g className="cursor-pointer">
                  <rect
                    x="50"
                    y="400"
                    width="280"
                    height="220"
                    rx="12"
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                  />
                  <text
                    x="190"
                    y="430"
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    ⚙️ Configurações
                  </text>
                  
                  <text x="70" y="460" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Threshold: 0.15 (vector) / 0.50 (keyword)
                  </text>
                  <text x="70" y="480" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Match Count: 5 chunks
                  </text>
                  <text x="70" y="500" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Embedding Model: text-embedding-3-small
                  </text>
                  <text x="70" y="520" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Chunk Size: 1500 palavras
                  </text>
                  <text x="70" y="540" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • LLMs: Gemini 2.5 Pro / GPT-5
                  </text>
                  <text x="70" y="560" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Busca: Vector + Keyword Fallback
                  </text>
                  <text x="70" y="580" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Tags Hierárquicas: Parent/Child
                  </text>
                  <text x="70" y="600" fill="hsl(var(--muted-foreground))" fontSize="12">
                    • Auto-categorização: LLM-based
                  </text>
                </g>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm">
                <p className="font-semibold mb-1">Configurações do Sistema</p>
                <p className="text-xs">
                  Parâmetros técnicos que controlam o comportamento do sistema RAG,
                  incluindo modelos de embedding, LLMs, thresholds de busca e configurações de chunking.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Legend */}
          <g>
            <rect
              x="360"
              y="520"
              width="180"
              height="100"
              rx="8"
              fill="hsl(var(--card))"
              stroke="hsl(var(--border))"
              strokeWidth="2"
            />
            <text
              x="450"
              y="545"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="14"
              fontWeight="bold"
            >
              📖 Legenda
            </text>
            
            <circle cx="380" cy="565" r="5" fill="hsl(var(--primary))" />
            <text x="395" y="570" fill="hsl(var(--muted-foreground))" fontSize="11">
              ETL Pipeline
            </text>
            
            <circle cx="380" cy="585" r="5" fill="hsl(var(--secondary))" />
            <text x="395" y="590" fill="hsl(var(--muted-foreground))" fontSize="11">
              Database Layer
            </text>
            
            <circle cx="380" cy="605" r="5" fill="hsl(var(--accent))" />
            <text x="395" y="610" fill="hsl(var(--muted-foreground))" fontSize="11">
              Retrieval Layer
            </text>
          </g>
        </svg>
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        💡 Passe o mouse sobre os elementos para ver detalhes • Use os controles de zoom para ampliar
      </p>
    </div>
  );
};
