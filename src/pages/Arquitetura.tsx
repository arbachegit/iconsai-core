import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Server, 
  DollarSign,
  Layers,
  Info,
  Play,
  Pause,
  Download,
  Loader2,
  Headphones,
  RotateCw,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Factory,
  FileImage,
  Activity,
  Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import ArchitectureCard from "@/components/admin/ArchitectureCard";
import SaasRagArchitectureDiagram from "@/components/admin/SaasRagArchitectureDiagram";
import DepartmentArchitectureDiagram from "@/components/admin/DepartmentArchitectureDiagram";
import { DynamicSLMArchitectureDiagram } from "@/components/admin/DynamicSLMArchitectureDiagram";
import HyperModularSLMDiagram from "@/components/admin/HyperModularSLMDiagram";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import knowriskLogo from "@/assets/knowrisk-logo.png";

type SimulationPhase = 'idle' | 'request' | 'routing' | 'check-adapter' | 'load-adapter' | 'inference' | 'response' | 'complete';
type ViewMode = 'cards' | 'gpu' | 'department-choice' | 'department-static' | 'department-dynamic' | 'saas-choice' | 'saas-static' | 'saas-dynamic';

interface BackButtonProps {
  onClick: () => void;
}

const BackButton = memo(({ onClick }: BackButtonProps) => (
  <Button 
    variant="outline" 
    onClick={onClick}
    className="gap-2"
    type="button"
  >
    <ArrowLeft className="h-4 w-4" />
    Voltar
  </Button>
));

const Arquitetura = () => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<ViewMode>('cards');
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<SimulationPhase>('idle');
  const [adapterLoaded, setAdapterLoaded] = useState(false);

  // Use global audio player context
  const { playAudio, floatingPlayerState } = useAudioPlayer();
  
  const AUDIO_URL = "https://gmflpmcepempcygdrayv.supabase.co/storage/v1/object/public/tooltip-audio/audio-contents/e137c34e-4523-406a-a7bc-35ac598cc9f6.mp3";
  const AUDIO_TITLE = "AI Escalável: O Segredo dos 90% Mais Barato! 💰";

  const handleGoHome = () => navigate('/');

  const isThisAudioActive = floatingPlayerState?.audioUrl === AUDIO_URL;
  const isPlaying = isThisAudioActive && floatingPlayerState?.isPlaying;
  const isLoading = isThisAudioActive && floatingPlayerState?.isLoading;

  const handleAudioPlayPause = () => {
    playAudio(AUDIO_TITLE, AUDIO_URL);
  };

  const handleAudioDownload = () => {
    const link = document.createElement('a');
    link.href = AUDIO_URL;
    link.download = 'ai-escalavel-90-mais-barato.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!isSimulating) {
      const interval = setInterval(() => {
        setAnimationKey(prev => prev + 1);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleReset = () => setZoom(100);

  const startSimulation = () => {
    setIsSimulating(true);
    setCurrentPhase('request');
    setAdapterLoaded(false);

    setTimeout(() => setCurrentPhase('routing'), 1000);
    setTimeout(() => setCurrentPhase('check-adapter'), 2500);
    setTimeout(() => setCurrentPhase('load-adapter'), 3500);
    setTimeout(() => {
      setAdapterLoaded(true);
      setCurrentPhase('inference');
    }, 5000);
    setTimeout(() => setCurrentPhase('response'), 6500);
    setTimeout(() => {
      setCurrentPhase('complete');
      setIsSimulating(false);
    }, 7500);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setCurrentPhase('idle');
    setAdapterLoaded(false);
    setAnimationKey(prev => prev + 1);
  };

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'request': return '📤 Requisição chegando (company_id: A)';
      case 'routing': return '🔀 Roteando para orquestrador...';
      case 'check-adapter': return '🔍 Verificando adapter na GPU...';
      case 'load-adapter': return '⬇️ Baixando adapter do S3 (~ms)...';
      case 'inference': return '⚡ Executando inferência isolada...';
      case 'response': return '📥 Retornando resposta...';
      case 'complete': return '✅ Requisição completa!';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'request': return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'routing': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'check-adapter': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500';
      case 'load-adapter': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'inference': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'response': return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'complete': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500';
      default: return '';
    }
  };

  const goToCards = () => setSelectedView('cards');
  const goToDepartmentChoice = () => setSelectedView('department-choice');
  const goToSaasChoice = () => setSelectedView('saas-choice');

  // Header with logo and back button
  const renderHeader = () => (
    <header className="w-full bg-card/80 backdrop-blur-md border-b border-border py-4 px-6 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <img 
          src={knowriskLogo} 
          alt="KnowRisk" 
          className="h-12 object-contain"
        />
        <Button
          variant="outline"
          onClick={handleGoHome}
          className="gap-2 hover:bg-primary/10"
        >
          <Home className="h-4 w-4" />
          Voltar para o App
        </Button>
      </div>
    </header>
  );

  // Brain flow animation component
  const renderBrainFlowAnimation = () => (
    <div className="w-full mt-8">
      <svg viewBox="0 0 900 180" className="w-full h-auto">
        <defs>
          {/* Gradients */}
          <linearGradient id="humanBrainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(340, 80%, 60%)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="aiBrainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(180, 80%, 50%)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(180, 80%, 60%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          </linearGradient>
          <filter id="brainGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Human Brain (left) */}
        <g transform="translate(80, 90)">
          {/* Brain outline - organic shape */}
          <path 
            d="M0,-45 C20,-50 40,-40 50,-25 C60,-10 55,15 45,30 C35,45 15,50 0,48 C-15,50 -35,45 -45,30 C-55,15 -60,-10 -50,-25 C-40,-40 -20,-50 0,-45 Z"
            fill="url(#humanBrainGradient)"
            filter="url(#brainGlow)"
            opacity="0.9"
          />
          {/* Brain wrinkles */}
          <path d="M-30,-20 Q-15,-30 0,-20 Q15,-30 30,-20" fill="none" stroke="hsl(var(--background))" strokeWidth="2" opacity="0.5" />
          <path d="M-25,0 Q-10,-10 5,0 Q20,-10 35,0" fill="none" stroke="hsl(var(--background))" strokeWidth="2" opacity="0.5" />
          <path d="M-20,20 Q0,10 20,20" fill="none" stroke="hsl(var(--background))" strokeWidth="2" opacity="0.5" />
          <text y="70" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="600">Cérebro Humano</text>
        </g>

        {/* AI Brain (right) */}
        <g transform="translate(820, 90)">
          {/* Brain outline with circuit pattern */}
          <path 
            d="M0,-45 C20,-50 40,-40 50,-25 C60,-10 55,15 45,30 C35,45 15,50 0,48 C-15,50 -35,45 -45,30 C-55,15 -60,-10 -50,-25 C-40,-40 -20,-50 0,-45 Z"
            fill="url(#aiBrainGradient)"
            filter="url(#brainGlow)"
            opacity="0.9"
          />
          {/* Circuit patterns */}
          <g stroke="hsl(var(--background))" strokeWidth="1.5" fill="none" opacity="0.7">
            <path d="M-30,-20 L-15,-20 L-15,-10 L0,-10 L0,0 L15,0" />
            <path d="M0,-35 L0,-20 L10,-20 L10,-5" />
            <path d="M-20,10 L-5,10 L-5,25 L10,25" />
            <path d="M15,-15 L25,-15 L25,5 L35,5" />
            <circle cx="-30" cy="-20" r="3" fill="hsl(180, 80%, 60%)" />
            <circle cx="0" cy="0" r="3" fill="hsl(180, 80%, 60%)" />
            <circle cx="10" cy="25" r="3" fill="hsl(180, 80%, 60%)" />
            <circle cx="35" cy="5" r="3" fill="hsl(180, 80%, 60%)" />
          </g>
          <text y="70" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="600">Cérebro Computacional</text>
        </g>

        {/* Flow arrows and words - Top flow (Human to AI) */}
        <g>
          {/* Arrow path */}
          <path 
            d="M140,70 Q450,20 760,70" 
            fill="none" 
            stroke="url(#flowGradient)" 
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity="0.6"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
          </path>
          
          {/* Flowing words */}
          <text fill="hsl(var(--primary))" fontSize="11" fontWeight="500" opacity="0.9">
            <textPath href="#topFlowPath" startOffset="20%">
              <animate attributeName="startOffset" from="0%" to="80%" dur="4s" repeatCount="indefinite" />
              Palavras
            </textPath>
          </text>
          <path id="topFlowPath" d="M140,55 Q450,5 760,55" fill="none" />
          
          {/* Animated dots */}
          <circle r="4" fill="hsl(var(--primary))" opacity="0.8">
            <animateMotion dur="3s" repeatCount="indefinite">
              <mpath href="#topFlowPath" />
            </animateMotion>
          </circle>
          <circle r="4" fill="hsl(180, 80%, 60%)" opacity="0.8">
            <animateMotion dur="3s" begin="1s" repeatCount="indefinite">
              <mpath href="#topFlowPath" />
            </animateMotion>
          </circle>
          <circle r="4" fill="hsl(var(--primary))" opacity="0.8">
            <animateMotion dur="3s" begin="2s" repeatCount="indefinite">
              <mpath href="#topFlowPath" />
            </animateMotion>
          </circle>

          {/* Label */}
          <text x="450" y="35" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontStyle="italic">
            Envia palavras, perguntas, dados...
          </text>
        </g>

        {/* Flow arrows and intelligence - Bottom flow (AI to Human) */}
        <g>
          {/* Arrow path */}
          <path 
            d="M760,110 Q450,160 140,110" 
            fill="none" 
            stroke="url(#flowGradient)" 
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity="0.6"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
          </path>
          
          <path id="bottomFlowPath" d="M760,125 Q450,175 140,125" fill="none" />
          
          {/* Animated dots */}
          <circle r="5" fill="hsl(180, 80%, 50%)" opacity="0.9">
            <animateMotion dur="3s" repeatCount="indefinite">
              <mpath href="#bottomFlowPath" />
            </animateMotion>
          </circle>
          <circle r="5" fill="hsl(var(--primary))" opacity="0.9">
            <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite">
              <mpath href="#bottomFlowPath" />
            </animateMotion>
          </circle>

          {/* Label */}
          <text x="450" y="165" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontStyle="italic">
            Retorna inteligência, insights, conhecimento...
          </text>
        </g>
      </svg>
    </div>
  );

  // Cards view
  if (selectedView === 'cards') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.08]">
              <defs>
                {/* Animated gradient */}
                <linearGradient id="bgFlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5">
                    <animate attributeName="stop-opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="hsl(180, 70%, 50%)" stopOpacity="0.5">
                    <animate attributeName="stop-opacity" values="0.7;0.3;0.7" dur="4s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                
                {/* Glow filter */}
                <filter id="bgGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Floating nodes with pulse animation */}
              {[
                { x: '10%', y: '20%', delay: '0s' },
                { x: '25%', y: '70%', delay: '0.5s' },
                { x: '40%', y: '15%', delay: '1s' },
                { x: '55%', y: '80%', delay: '1.5s' },
                { x: '70%', y: '30%', delay: '2s' },
                { x: '85%', y: '60%', delay: '2.5s' },
                { x: '15%', y: '45%', delay: '3s' },
                { x: '90%', y: '15%', delay: '0.3s' },
                { x: '50%', y: '50%', delay: '1.2s' },
                { x: '75%', y: '85%', delay: '1.8s' },
              ].map((node, i) => (
                <g key={i} filter="url(#bgGlow)">
                  {/* Server/Node icon */}
                  <rect 
                    x={node.x} 
                    y={node.y} 
                    width="24" 
                    height="30" 
                    rx="3"
                    fill="none" 
                    stroke="url(#bgFlowGradient)" 
                    strokeWidth="1.5"
                  >
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin={node.delay} repeatCount="indefinite" />
                  </rect>
                  <line x1={`calc(${node.x} + 4px)`} y1={`calc(${node.y} + 8px)`} x2={`calc(${node.x} + 20px)`} y2={`calc(${node.y} + 8px)`} stroke="url(#bgFlowGradient)" strokeWidth="1">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin={node.delay} repeatCount="indefinite" />
                  </line>
                  <line x1={`calc(${node.x} + 4px)`} y1={`calc(${node.y} + 14px)`} x2={`calc(${node.x} + 20px)`} y2={`calc(${node.y} + 14px)`} stroke="url(#bgFlowGradient)" strokeWidth="1">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin={node.delay} repeatCount="indefinite" />
                  </line>
                  <line x1={`calc(${node.x} + 4px)`} y1={`calc(${node.y} + 20px)`} x2={`calc(${node.x} + 20px)`} y2={`calc(${node.y} + 20px)`} stroke="url(#bgFlowGradient)" strokeWidth="1">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin={node.delay} repeatCount="indefinite" />
                  </line>
                </g>
              ))}

              {/* Floating connection lines */}
              {[
                { x1: '12%', y1: '22%', x2: '38%', y2: '17%', delay: '0s' },
                { x1: '42%', y1: '17%', x2: '68%', y2: '32%', delay: '0.5s' },
                { x1: '72%', y1: '32%', x2: '88%', y2: '17%', delay: '1s' },
                { x1: '27%', y1: '72%', x2: '53%', y2: '52%', delay: '1.5s' },
                { x1: '57%', y1: '82%', x2: '73%', y2: '87%', delay: '2s' },
                { x1: '17%', y1: '47%', x2: '23%', y2: '72%', delay: '2.5s' },
                { x1: '87%', y1: '62%', x2: '92%', y2: '17%', delay: '0.8s' },
              ].map((line, i) => (
                <line 
                  key={i}
                  x1={line.x1} 
                  y1={line.y1} 
                  x2={line.x2} 
                  y2={line.y2} 
                  stroke="url(#bgFlowGradient)" 
                  strokeWidth="1"
                  strokeDasharray="6,4"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" begin={line.delay} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" begin={line.delay} repeatCount="indefinite" />
                </line>
              ))}

              {/* Floating CPU/Chip symbols */}
              {[
                { x: '30%', y: '40%', size: 40, delay: '0.2s' },
                { x: '65%', y: '55%', size: 35, delay: '1.2s' },
                { x: '80%', y: '40%', size: 45, delay: '2.2s' },
              ].map((chip, i) => (
                <g key={`chip-${i}`} transform={`translate(${chip.x}, ${chip.y})`}>
                  {/* CPU body */}
                  <rect 
                    x="-15" 
                    y="-15" 
                    width="30" 
                    height="30" 
                    rx="2"
                    fill="none" 
                    stroke="url(#bgFlowGradient)" 
                    strokeWidth="1.5"
                  >
                    <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" begin={chip.delay} repeatCount="indefinite" />
                  </rect>
                  {/* CPU pins */}
                  {[-10, -3, 4, 11].map((pos, j) => (
                    <g key={j}>
                      <line x1={pos.toString()} y1="-15" x2={pos.toString()} y2="-22" stroke="url(#bgFlowGradient)" strokeWidth="1">
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" begin={chip.delay} repeatCount="indefinite" />
                      </line>
                      <line x1={pos.toString()} y1="15" x2={pos.toString()} y2="22" stroke="url(#bgFlowGradient)" strokeWidth="1">
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" begin={chip.delay} repeatCount="indefinite" />
                      </line>
                      <line x1="-15" y1={pos.toString()} x2="-22" y2={pos.toString()} stroke="url(#bgFlowGradient)" strokeWidth="1">
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" begin={chip.delay} repeatCount="indefinite" />
                      </line>
                      <line x1="15" y1={pos.toString()} x2="22" y2={pos.toString()} stroke="url(#bgFlowGradient)" strokeWidth="1">
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" begin={chip.delay} repeatCount="indefinite" />
                      </line>
                    </g>
                  ))}
                  {/* CPU core */}
                  <rect x="-8" y="-8" width="16" height="16" rx="1" fill="url(#bgFlowGradient)">
                    <animate attributeName="opacity" values="0.1;0.4;0.1" dur="5s" begin={chip.delay} repeatCount="indefinite" />
                  </rect>
                </g>
              ))}

              {/* Cloud symbols */}
              {[
                { x: '20%', y: '25%', delay: '0.7s' },
                { x: '78%', y: '70%', delay: '1.7s' },
              ].map((cloud, i) => (
                <g key={`cloud-${i}`} transform={`translate(${cloud.x}, ${cloud.y})`}>
                  <path 
                    d="M-20,10 C-25,10 -28,5 -25,0 C-25,-5 -20,-8 -15,-7 C-12,-15 0,-15 5,-8 C12,-12 22,-8 22,0 C28,2 28,10 22,12 L-20,12 Z" 
                    fill="none" 
                    stroke="url(#bgFlowGradient)" 
                    strokeWidth="1.5"
                  >
                    <animate attributeName="opacity" values="0.2;0.6;0.2" dur="6s" begin={cloud.delay} repeatCount="indefinite" />
                  </path>
                </g>
              ))}

              {/* Data packets flowing */}
              {[0, 1, 2, 3, 4].map((i) => (
                <circle 
                  key={`packet-${i}`}
                  r="3" 
                  fill="url(#bgFlowGradient)"
                >
                  <animate 
                    attributeName="cx" 
                    values="5%;25%;50%;75%;95%" 
                    dur={`${8 + i * 2}s`} 
                    begin={`${i * 1.5}s`} 
                    repeatCount="indefinite" 
                  />
                  <animate 
                    attributeName="cy" 
                    values={`${20 + i * 15}%;${40 + i * 10}%;${30 + i * 12}%;${50 + i * 8}%;${25 + i * 14}%`}
                    dur={`${8 + i * 2}s`} 
                    begin={`${i * 1.5}s`} 
                    repeatCount="indefinite" 
                  />
                  <animate attributeName="opacity" values="0;0.8;0.8;0" dur={`${8 + i * 2}s`} begin={`${i * 1.5}s`} repeatCount="indefinite" />
                </circle>
              ))}

              {/* Binary streams */}
              {[
                { x: '5%', y: '90%', text: '01001010', delay: '0s' },
                { x: '92%', y: '5%', text: '11010110', delay: '2s' },
                { x: '45%', y: '92%', text: '10110011', delay: '4s' },
              ].map((binary, i) => (
                <text 
                  key={`binary-${i}`}
                  x={binary.x} 
                  y={binary.y} 
                  fill="url(#bgFlowGradient)" 
                  fontSize="10" 
                  fontFamily="monospace"
                >
                  <animate attributeName="opacity" values="0;0.5;0" dur="6s" begin={binary.delay} repeatCount="indefinite" />
                  {binary.text}
                </text>
              ))}
            </svg>
          </div>
          
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-8 relative z-10">
            <div className="text-center py-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Arquitetura de Infraestrutura</h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Selecione uma visualização para explorar a arquitetura do sistema
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ArchitectureCard
                title="Arquitetura de GPU"
                description="Infraestrutura GPU com LoRA Adapters para inferência multi-tenant"
                icon={Server}
                color="cyan"
                badge="AWS g5.xlarge"
                onClick={() => setSelectedView('gpu')}
              />
              <ArchitectureCard
                title="Uma Empresa, Vários Departamentos"
                description="SLM customizado por departamento com base de conhecimento compartilhada"
                icon={Building2}
                color="green"
                badge="Multi-RAG"
                onClick={() => setSelectedView('department-choice')}
              />
              <ArchitectureCard
                title="Empresas Diferentes"
                description="SLM modular para múltiplas empresas com isolamento completo"
                icon={Factory}
                color="purple"
                badge="SaaS"
                onClick={() => setSelectedView('saas-choice')}
              />
            </div>

            {/* Brain Flow Animation */}
            {renderBrainFlowAnimation()}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Department choice view
  if (selectedView === 'department-choice') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
            <BackButton onClick={goToCards} />
            
            <div>
              <h1 className="text-3xl font-bold text-gradient">Uma Empresa, Vários Departamentos</h1>
              <p className="text-muted-foreground mt-2">
                Selecione o tipo de visualização da arquitetura
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ArchitectureCard
                title="Esquema Estático"
                description="Diagrama estrutural com hierarquia de departamentos e fluxo de dados"
                icon={FileImage}
                color="green"
                badge="Estrutura"
                onClick={() => setSelectedView('department-static')}
              />
              <ArchitectureCard
                title="Sistema Dinâmico"
                description="Visualização animada com fluxos de segurança e compartilhamento de conhecimento"
                icon={Activity}
                color="cyan"
                badge="Animado"
                onClick={() => setSelectedView('department-dynamic')}
              />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Department static view
  if (selectedView === 'department-static') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
            <BackButton onClick={goToDepartmentChoice} />
            <DepartmentArchitectureDiagram />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Department dynamic view
  if (selectedView === 'department-dynamic') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
            <BackButton onClick={goToDepartmentChoice} />
            <DynamicSLMArchitectureDiagram />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // SaaS choice view
  if (selectedView === 'saas-choice') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
            <BackButton onClick={goToCards} />
            
            <div>
              <h1 className="text-3xl font-bold text-gradient">Empresas Diferentes</h1>
              <p className="text-muted-foreground mt-2">
                Selecione o tipo de visualização da arquitetura SLM multi-tenant
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ArchitectureCard
                title="Esquema Estático"
                description="Diagrama estrutural com pipeline de inferência e RAG customizado"
                icon={FileImage}
                color="purple"
                badge="Estrutura"
                onClick={() => setSelectedView('saas-static')}
              />
              <ArchitectureCard
                title="Sistema Dinâmico"
                description="Visualização lúdica com fluxos de segurança, hiperfoco e eficiência compartilhada"
                icon={Activity}
                color="cyan"
                badge="Animado"
                onClick={() => setSelectedView('saas-dynamic')}
              />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // SaaS static view
  if (selectedView === 'saas-static') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
            <BackButton onClick={goToSaasChoice} />
            <SaasRagArchitectureDiagram />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // SaaS dynamic view
  if (selectedView === 'saas-dynamic') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
            <BackButton onClick={goToSaasChoice} />
            <HyperModularSLMDiagram />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // GPU view
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {renderHeader()}
        <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
          <BackButton onClick={goToCards} />
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold text-gradient">Arquitetura KY AI SLM</h1>
              <p className="text-muted-foreground mt-1">
                Small Language Model Infrastructure - Base Model + LoRA Adapters
              </p>
            </div>

            {/* Audio Player */}
            <div className="flex items-center gap-3 bg-card border border-primary/30 rounded-lg px-4 py-2 flex-shrink-0">
              <Headphones className="h-4 w-4 text-primary flex-shrink-0" />
              <span 
                className="text-sm font-medium max-w-[200px] truncate text-foreground" 
                title={AUDIO_TITLE}
              >
                {AUDIO_TITLE}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAudioPlayPause} 
                  className="h-8 w-8 hover:bg-primary/20"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {isPlaying && <Pause className="h-4 w-4 text-primary" />}
                  {!isLoading && !isPlaying && <Play className="h-4 w-4 text-primary" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAudioDownload} 
                  className="h-8 w-8 hover:bg-primary/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 flex-shrink-0">
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

          {/* Simulation Controls */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={startSimulation} 
                  disabled={isSimulating}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isSimulating ? 'Simulando...' : 'Simular Requisição'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetSimulation}
                  disabled={currentPhase === 'idle'}
                  className="gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  Resetar
                </Button>
                {currentPhase !== 'idle' && (
                  <Badge variant="outline" className={getPhaseColor()}>
                    {getPhaseLabel()}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Architecture SVG - Simplified version */}
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
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Background Grid */}
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
                      />
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
                      />
                    ))}
                  </g>

                  {/* GPU Container */}
                  <rect x="200" y="150" width="500" height="400" rx="20" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
                  <text x="450" y="190" textAnchor="middle" fill="hsl(var(--primary))" fontSize="18" fontWeight="bold">
                    GPU Instance (AWS g5.xlarge)
                  </text>

                  {/* Base Model */}
                  <rect x="300" y="250" width="300" height="80" rx="10" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
                  <text x="450" y="290" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">
                    Base Model (Shared)
                  </text>
                  <text x="450" y="310" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
                    Llama 3.2 3B / Qwen 2.5 3B
                  </text>

                  {/* LoRA Adapters */}
                  <g>
                    <rect x="250" y="380" width="120" height="60" rx="8" fill="hsl(188 100% 50% / 0.2)" stroke="hsl(188 100% 50%)" strokeWidth="2" />
                    <text x="310" y="415" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">LoRA A</text>
                  </g>
                  <g>
                    <rect x="390" y="380" width="120" height="60" rx="8" fill="hsl(280 100% 60% / 0.2)" stroke="hsl(280 100% 60%)" strokeWidth="2" />
                    <text x="450" y="415" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">LoRA B</text>
                  </g>
                  <g>
                    <rect x="530" y="380" width="120" height="60" rx="8" fill="hsl(142 100% 50% / 0.2)" stroke="hsl(142 100% 50%)" strokeWidth="2" />
                    <text x="590" y="415" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">LoRA C</text>
                  </g>

                  {/* S3 Storage */}
                  <rect x="700" y="350" width="150" height="100" rx="10" fill="hsl(32 100% 50% / 0.2)" stroke="hsl(32 100% 50%)" strokeWidth="2" />
                  <text x="775" y="390" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">S3 Storage</text>
                  <text x="775" y="410" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">LoRA Adapters</text>
                  <text x="775" y="430" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">(~50MB each)</text>

                  {/* Connection lines */}
                  <line x1="650" y1="400" x2="700" y2="400" stroke="hsl(32 100% 50%)" strokeWidth="2" strokeDasharray="5,5" />

                  {/* Request flow indicator */}
                  <circle cx="450" cy="100" r="30" fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" strokeWidth="2">
                    {isSimulating && (
                      <animate attributeName="r" values="30;35;30" dur="1s" repeatCount="indefinite" />
                    )}
                  </circle>
                  <text x="450" y="105" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">API</text>

                  {/* Flow arrows */}
                  <path d="M450 130 L450 150" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <path d="M450 330 L310 380" stroke="hsl(188 100% 50%)" strokeWidth="2" />
                  <path d="M450 330 L450 380" stroke="hsl(280 100% 60%)" strokeWidth="2" />
                  <path d="M450 330 L590 380" stroke="hsl(142 100% 50%)" strokeWidth="2" />

                  {/* Cost savings badge */}
                  <rect x="50" y="500" width="150" height="60" rx="10" fill="hsl(142 100% 50% / 0.2)" stroke="hsl(142 100% 50%)" strokeWidth="2" />
                  <text x="125" y="525" textAnchor="middle" fill="hsl(142 100% 50%)" fontSize="14" fontWeight="bold">💰 90% Savings</text>
                  <text x="125" y="545" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">vs dedicated instances</text>
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Server className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Multi-Tenant</h4>
                    <p className="text-sm text-muted-foreground">Uma GPU, múltiplas empresas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Layers className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">LoRA Adapters</h4>
                    <p className="text-sm text-muted-foreground">Hot-swap em milissegundos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Custo Otimizado</h4>
                    <p className="text-sm text-muted-foreground">90% mais barato que dedicado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Arquitetura;
