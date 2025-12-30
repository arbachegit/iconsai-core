import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Globe,
  FlaskConical,
  Smartphone,
  ShoppingCart,
  ArrowRightLeft,
  Users,
  Wifi,
  Bot,
  Brain,
  Server,
  Lightbulb,
  BookOpen,
  DollarSign,
  Zap,
  Target,
  Gem,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  MessageCircle,
  Building2,
  Store,
  TrendingUp,
  Share2,
  X,
  MapPin,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types
interface DiagramNode {
  id: string;
  label: string;
  type: "source" | "aggregator" | "process" | "robot" | "server" | "output" | "destination";
  icon: LucideIcon;
  x: number;
  y: number;
  column: number;
  description: string;
}

interface Connection {
  from: string;
  to: string;
}

// Color system
const nodeColors = {
  source: { bg: "rgba(251, 191, 36, 0.15)", border: "#F59E0B", text: "#FCD34D", glow: "rgba(251, 191, 36, 0.4)" },
  aggregator: { bg: "rgba(251, 191, 36, 0.2)", border: "#10B981", text: "#FCD34D", glow: "rgba(16, 185, 129, 0.4)" },
  process: { bg: "rgba(16, 185, 129, 0.2)", border: "#10B981", text: "#6EE7B7", glow: "rgba(16, 185, 129, 0.4)" },
  robot: { bg: "rgba(59, 130, 246, 0.2)", border: "#3B82F6", text: "#93C5FD", glow: "rgba(59, 130, 246, 0.4)" },
  server: { bg: "rgba(16, 185, 129, 0.3)", border: "#10B981", text: "#6EE7B7", glow: "rgba(16, 185, 129, 0.5)" },
  output: { bg: "rgba(244, 63, 94, 0.2)", border: "#F43F5E", text: "#FDA4AF", glow: "rgba(244, 63, 94, 0.4)" },
  destination: { bg: "rgba(16, 185, 129, 0.3)", border: "#10B981", text: "#6EE7B7", glow: "rgba(16, 185, 129, 0.5)" },
};

// Node dimensions
const NODE_WIDTH = 100;
const NODE_HEIGHT = 32;
const SERVER_WIDTH = 120;
const SERVER_HEIGHT = 80;

// Nodes data
const nodes: DiagramNode[] = [
  // Column 1 - FONTES (sources)
  { id: "src-1", label: "Dados abertos", type: "source", icon: Database, x: 30, y: 40, column: 1, description: "Dados públicos governamentais disponíveis para acesso" },
  { id: "src-2", label: "Info públicas", type: "source", icon: Globe, x: 30, y: 85, column: 1, description: "Informações de domínio público" },
  { id: "src-3", label: "Dados científicos", type: "source", icon: FlaskConical, x: 30, y: 130, column: 1, description: "Pesquisas e estudos acadêmicos" },
  { id: "src-4", label: "Aplicativos", type: "source", icon: Smartphone, x: 30, y: 200, column: 1, description: "Dados de aplicações móveis e web" },
  { id: "src-5", label: "Serviços", type: "source", icon: ShoppingCart, x: 30, y: 245, column: 1, description: "Informações de serviços prestados" },
  { id: "src-6", label: "Transações", type: "source", icon: ArrowRightLeft, x: 30, y: 290, column: 1, description: "Dados transacionais do varejo" },
  { id: "src-7", label: "Info públicas", type: "source", icon: Globe, x: 30, y: 360, column: 1, description: "Informações públicas de mercado" },
  { id: "src-8", label: "Dados mercado", type: "source", icon: TrendingUp, x: 30, y: 405, column: 1, description: "Indicadores e tendências de mercado" },
  { id: "src-9", label: "Pessoas", type: "source", icon: Users, x: 30, y: 500, column: 1, description: "Dados demográficos e comportamentais" },
  { id: "src-10", label: "Internet", type: "source", icon: Wifi, x: 30, y: 545, column: 1, description: "Dados de navegação e comportamento online" },
  { id: "src-11", label: "Mundo conectado", type: "source", icon: Globe, x: 30, y: 590, column: 1, description: "IoT e dispositivos conectados" },

  // Column 2 - AGREGADORES
  { id: "agg-1", label: "Governo", type: "aggregator", icon: Building2, x: 180, y: 85, column: 2, description: "Agregador de dados governamentais (IBGE, BCB, IPEA)" },
  { id: "agg-2", label: "Varejo", type: "aggregator", icon: Store, x: 180, y: 245, column: 2, description: "Agregador de dados do setor varejista" },
  { id: "agg-3", label: "Mercado Aberto", type: "aggregator", icon: TrendingUp, x: 180, y: 380, column: 2, description: "Agregador de dados de mercado financeiro" },
  { id: "agg-4", label: "Redes Sociais", type: "aggregator", icon: Share2, x: 180, y: 545, column: 2, description: "Agregador de dados de mídias sociais" },

  // Column 3 - PROCESSOS (upper)
  { id: "proc-1", label: "Recebe dados", type: "process", icon: Database, x: 340, y: 120, column: 3, description: "Recepção e validação de dados brutos" },
  { id: "proc-2", label: "Processa info", type: "process", icon: Zap, x: 340, y: 175, column: 3, description: "Processamento e transformação de informações" },
  { id: "proc-3", label: "Aplica IA", type: "process", icon: Brain, x: 340, y: 230, column: 3, description: "Aplicação de modelos de inteligência artificial" },
  { id: "proc-4", label: "Gera insights", type: "process", icon: Lightbulb, x: 340, y: 285, column: 3, description: "Geração de insights estratégicos" },

  // Column 3 - ROBÔS (lower)
  { id: "robot-1", label: "Coleta auto", type: "robot", icon: Bot, x: 340, y: 420, column: 3, description: "Coleta automatizada de dados via bots" },
  { id: "robot-2", label: "Agregação", type: "robot", icon: Database, x: 340, y: 475, column: 3, description: "Agregação e consolidação de dados" },
  { id: "robot-3", label: "Robô Coletor", type: "robot", icon: Bot, x: 340, y: 530, column: 3, description: "Bot especializado em web scraping" },
  { id: "robot-4", label: "Transferência", type: "robot", icon: ArrowRightLeft, x: 340, y: 585, column: 3, description: "Transferência segura de dados" },

  // Column 4 - SERVIDOR
  { id: "server-1", label: "Servidor KnowYOU AI", type: "server", icon: Server, x: 500, y: 300, column: 4, description: "Servidor central de processamento com IA avançada" },

  // Column 5 - OUTPUTS
  { id: "out-1", label: "Informação", type: "output", icon: BookOpen, x: 680, y: 150, column: 5, description: "Informações estruturadas e validadas" },
  { id: "out-2", label: "Conhecimento", type: "output", icon: Brain, x: 680, y: 220, column: 5, description: "Conhecimento contextualizado" },
  { id: "out-3", label: "Riqueza", type: "output", icon: DollarSign, x: 680, y: 290, column: 5, description: "Valor econômico gerado" },
  { id: "out-4", label: "Inteligência", type: "output", icon: Zap, x: 680, y: 360, column: 5, description: "Inteligência estratégica" },
  { id: "out-5", label: "Precisão", type: "output", icon: Target, x: 680, y: 430, column: 5, description: "Dados com alta precisão" },
  { id: "out-6", label: "Valor", type: "output", icon: Gem, x: 680, y: 500, column: 5, description: "Valor agregado para decisões" },

  // Column 6 - DESTINO
  { id: "dest-1", label: "Brasil", type: "destination", icon: MapPin, x: 820, y: 320, column: 6, description: "Entrega de valor para o mercado brasileiro" },
];

// Connections data
const connections: Connection[] = [
  // Sources to Aggregators
  { from: "src-1", to: "agg-1" },
  { from: "src-2", to: "agg-1" },
  { from: "src-3", to: "agg-1" },
  { from: "src-4", to: "agg-2" },
  { from: "src-5", to: "agg-2" },
  { from: "src-6", to: "agg-2" },
  { from: "src-7", to: "agg-3" },
  { from: "src-8", to: "agg-3" },
  { from: "src-9", to: "agg-4" },
  { from: "src-10", to: "agg-4" },
  { from: "src-11", to: "agg-4" },
  // Aggregators to Processes
  { from: "agg-1", to: "proc-1" },
  { from: "agg-2", to: "proc-1" },
  { from: "agg-3", to: "robot-1" },
  { from: "agg-4", to: "robot-1" },
  // Processes chain
  { from: "proc-1", to: "proc-2" },
  { from: "proc-2", to: "proc-3" },
  { from: "proc-3", to: "proc-4" },
  { from: "proc-4", to: "server-1" },
  // Robots chain
  { from: "robot-1", to: "robot-2" },
  { from: "robot-2", to: "robot-3" },
  { from: "robot-3", to: "robot-4" },
  { from: "robot-4", to: "server-1" },
  // Server to Outputs
  { from: "server-1", to: "out-1" },
  { from: "server-1", to: "out-2" },
  { from: "server-1", to: "out-3" },
  { from: "server-1", to: "out-4" },
  { from: "server-1", to: "out-5" },
  { from: "server-1", to: "out-6" },
  // Outputs to Destination
  { from: "out-1", to: "dest-1" },
  { from: "out-2", to: "dest-1" },
  { from: "out-3", to: "dest-1" },
  { from: "out-4", to: "dest-1" },
  { from: "out-5", to: "dest-1" },
  { from: "out-6", to: "dest-1" },
];

// Helper functions
const getNodeById = (id: string): DiagramNode | undefined => nodes.find((n) => n.id === id);

const generatePath = (fromNode: DiagramNode, toNode: DiagramNode): string => {
  const fromWidth = fromNode.type === "server" ? SERVER_WIDTH : NODE_WIDTH;
  const toHeight = toNode.type === "server" ? SERVER_HEIGHT : NODE_HEIGHT;
  
  const startX = fromNode.x + fromWidth;
  const startY = fromNode.y + (fromNode.type === "server" ? SERVER_HEIGHT / 2 : NODE_HEIGHT / 2);
  const endX = toNode.x;
  const endY = toNode.y + toHeight / 2;
  
  const midX = (startX + endX) / 2;
  
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
};

const getConnectionCount = (nodeId: string): number => {
  return connections.filter((c) => c.from === nodeId || c.to === nodeId).length;
};

export const RetailSystemDiagram: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const totalSteps = 6;

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev >= totalSteps ? 0 : prev + 1));
    }, 3000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);
  const resetAnimation = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  const shareWhatsApp = useCallback(() => {
    const text = encodeURIComponent("Confira o fluxo de dados do sistema KnowYOU AI para varejo brasileiro!");
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, []);

  // Determine which columns are active based on current step
  const activeColumns = useMemo(() => {
    if (currentStep === 0) return [];
    return Array.from({ length: currentStep }, (_, i) => i + 1);
  }, [currentStep]);

  const isNodeActive = useCallback(
    (node: DiagramNode) => activeColumns.includes(node.column),
    [activeColumns]
  );

  const isConnectionActive = useCallback(
    (conn: Connection) => {
      const fromNode = getNodeById(conn.from);
      const toNode = getNodeById(conn.to);
      if (!fromNode || !toNode) return false;
      return activeColumns.includes(fromNode.column) && activeColumns.includes(toNode.column);
    },
    [activeColumns]
  );

  return (
    <TooltipProvider>
      <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden">
        {/* Header Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white/90">
            Fluxo de Dados - Sistema de Varejo Brasileiro
          </h2>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? "Pausar" : "Reproduzir"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={resetAnimation}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reiniciar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Ativar áudio" : "Desativar áudio"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  onClick={shareWhatsApp}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Compartilhar no WhatsApp</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* SVG Diagram */}
        <div className="flex-1 relative overflow-hidden">
          <svg
            viewBox="0 0 900 680"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Definitions */}
            <defs>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
              {/* Glow filters */}
              {Object.entries(nodeColors).map(([type, colors]) => (
                <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feFlood floodColor={colors.glow} result="glowColor" />
                  <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                  <feMerge>
                    <feMergeNode in="softGlow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {/* Background */}
            <rect width="100%" height="100%" fill="url(#bgGradient)" />
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Column Labels */}
            <g className="column-labels">
              {[
                { x: 80, label: "FONTES", color: "#F59E0B" },
                { x: 230, label: "AGREGADORES", color: "#10B981" },
                { x: 390, label: "PROCESSOS", color: "#10B981" },
                { x: 560, label: "SERVIDOR", color: "#10B981" },
                { x: 730, label: "OUTPUTS", color: "#F43F5E" },
                { x: 870, label: "DESTINO", color: "#10B981" },
              ].map((col, i) => (
                <text
                  key={i}
                  x={col.x}
                  y={22}
                  fill={col.color}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={activeColumns.includes(i + 1) || currentStep === 0 ? 1 : 0.3}
                >
                  {col.label}
                </text>
              ))}
            </g>

            {/* Connections */}
            <g className="connections">
              {connections.map((conn, idx) => {
                const fromNode = getNodeById(conn.from);
                const toNode = getNodeById(conn.to);
                if (!fromNode || !toNode) return null;

                const pathD = generatePath(fromNode, toNode);
                const active = isConnectionActive(conn);
                const colors = nodeColors[toNode.type];

                return (
                  <g key={idx}>
                    {/* Connection path */}
                    <motion.path
                      d={pathD}
                      fill="none"
                      stroke={active ? colors.border : "rgba(255,255,255,0.1)"}
                      strokeWidth={active ? 2 : 1}
                      initial={{ pathLength: 0, opacity: 0.3 }}
                      animate={{
                        pathLength: active ? 1 : 0.3,
                        opacity: active ? 0.8 : 0.2,
                      }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                    {/* Animated particle */}
                    {active && isPlaying && (
                      <motion.circle
                        r="3"
                        fill={colors.border}
                        initial={{ offsetDistance: "0%" }}
                        animate={{ offsetDistance: "100%" }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                          delay: idx * 0.1,
                        }}
                        style={{ offsetPath: `path("${pathD}")` }}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {nodes.map((node) => {
                const colors = nodeColors[node.type];
                const active = isNodeActive(node);
                const isServer = node.type === "server";
                const isHovered = hoveredNode === node.id;
                const width = isServer ? SERVER_WIDTH : NODE_WIDTH;
                const height = isServer ? SERVER_HEIGHT : NODE_HEIGHT;
                const IconComponent = node.icon;

                return (
                  <motion.g
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: active || currentStep === 0 ? 1 : 0.4,
                      scale: active && isPlaying ? [1, 1.02, 1] : 1,
                    }}
                    transition={{
                      opacity: { duration: 0.5 },
                      scale: { duration: 1.5, repeat: active && isPlaying ? Infinity : 0 },
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(node)}
                    style={{ cursor: "pointer" }}
                    filter={isHovered || (active && isPlaying) ? `url(#glow-${node.type})` : undefined}
                  >
                    {/* Node background */}
                    <motion.rect
                      x={node.x}
                      y={node.y}
                      width={width}
                      height={height}
                      rx={isServer ? 12 : 6}
                      fill={colors.bg}
                      stroke={colors.border}
                      strokeWidth={isHovered ? 2 : 1.5}
                      whileHover={{ scale: 1.05 }}
                    />
                    {/* Icon */}
                    <foreignObject
                      x={node.x + (isServer ? 4 : 4)}
                      y={node.y + (isServer ? height / 2 - 8 : 8)}
                      width={16}
                      height={16}
                    >
                      <IconComponent
                        className="w-4 h-4"
                        style={{ color: colors.text }}
                      />
                    </foreignObject>
                    {/* Label */}
                    <text
                      x={node.x + (isServer ? width / 2 : 24)}
                      y={node.y + (isServer ? height / 2 + 4 : height / 2 + 4)}
                      fill={colors.text}
                      fontSize={isServer ? 11 : 9}
                      fontWeight="500"
                      textAnchor={isServer ? "middle" : "start"}
                    >
                      {node.label}
                    </text>
                  </motion.g>
                );
              })}
            </g>
          </svg>

          {/* Info Panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-4 top-4 w-64 bg-slate-900/95 border border-white/10 rounded-lg p-4 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <selectedNode.icon
                      className="w-5 h-5"
                      style={{ color: nodeColors[selectedNode.type].text }}
                    />
                    <h3 className="font-semibold text-white">{selectedNode.label}</h3>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-white/50 hover:text-white"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Badge
                  className="mb-3 capitalize"
                  style={{
                    backgroundColor: nodeColors[selectedNode.type].bg,
                    color: nodeColors[selectedNode.type].text,
                    borderColor: nodeColors[selectedNode.type].border,
                  }}
                >
                  {selectedNode.type}
                </Badge>
                <p className="text-sm text-white/70 mb-3">{selectedNode.description}</p>
                <div className="text-xs text-white/50">
                  Conexões: {getConnectionCount(selectedNode.id)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-3 bg-black/30 border-t border-white/10">
          {Array.from({ length: totalSteps + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                currentStep === i
                  ? "bg-emerald-500 scale-125 shadow-lg shadow-emerald-500/50"
                  : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Etapa ${i}`}
            />
          ))}
          <span className="ml-3 text-xs text-white/50">
            Etapa {currentStep}/{totalSteps}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RetailSystemDiagram;
