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
  Globe,
  MessageCircle,
  Sparkles
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
          <Globe className="h-4 w-4" />
          Voltar para o App
        </Button>
      </div>
    </header>
  );

  // Brain flow animation component - Cognitive Processing Diagram
  const renderBrainFlowAnimation = () => (
    <div className="w-full mt-12 relative">
      {/* Container with cyberpunk styling */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Animated cyberpunk background */}
        <div className="absolute inset-0 overflow-hidden">
          <svg width="100%" height="100%" className="opacity-20">
            <defs>
              <linearGradient id="cyberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8">
                  <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6">
                  <animate attributeName="stop-opacity" values="0.6;0.3;0.6" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8">
                  <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <filter id="cyberGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Hexagonal grid pattern */}
            {Array.from({ length: 12 }).map((_, i) => (
              <g key={`hex-${i}`} transform={`translate(${(i % 6) * 150 + 50}, ${Math.floor(i / 6) * 120 + 40})`}>
                <polygon
                  points="30,0 60,17 60,52 30,69 0,52 0,17"
                  fill="none"
                  stroke="url(#cyberGradient)"
                  strokeWidth="0.5"
                >
                  <animate attributeName="opacity" values="0.1;0.4;0.1" dur={`${3 + (i % 3)}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </polygon>
              </g>
            ))}

            {/* Flowing code streams */}
            {['10110', '01001', '11010', '00111', '10101'].map((code, i) => (
              <text
                key={`code-${i}`}
                x={`${15 + i * 20}%`}
                y="10%"
                fill="url(#cyberGradient)"
                fontSize="9"
                fontFamily="monospace"
              >
                <animate attributeName="y" values="-5%;110%" dur={`${6 + i}s`} begin={`${i * 1.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0.6;0.6;0" dur={`${6 + i}s`} begin={`${i * 1.5}s`} repeatCount="indefinite" />
                {code}
              </text>
            ))}

            {/* Network nodes pulsing */}
            {[
              { x: '10%', y: '30%' }, { x: '25%', y: '70%' }, { x: '40%', y: '25%' },
              { x: '60%', y: '75%' }, { x: '75%', y: '35%' }, { x: '90%', y: '65%' }
            ].map((node, i) => (
              <g key={`node-${i}`}>
                <circle cx={node.x} cy={node.y} r="4" fill="url(#cyberGradient)" filter="url(#cyberGlow)">
                  <animate attributeName="r" values="3;6;3" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}

            {/* Connection lines between nodes */}
            {[
              { x1: '10%', y1: '30%', x2: '25%', y2: '70%' },
              { x1: '25%', y1: '70%', x2: '40%', y2: '25%' },
              { x1: '40%', y1: '25%', x2: '60%', y2: '75%' },
              { x1: '60%', y1: '75%', x2: '75%', y2: '35%' },
              { x1: '75%', y1: '35%', x2: '90%', y2: '65%' }
            ].map((line, i) => (
              <line
                key={`conn-${i}`}
                x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                stroke="url(#cyberGradient)"
                strokeWidth="1"
                strokeDasharray="4,4"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </line>
            ))}
          </svg>
        </div>

        {/* Main cognitive flow diagram */}
        <svg viewBox="0 0 1000 280" className="w-full h-auto relative z-10 py-6">
          <defs>
            {/* Human brain gradient - warm magenta/pink */}
            <linearGradient id="humanBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f472b6" stopOpacity="1" />
              <stop offset="100%" stopColor="#db2777" stopOpacity="0.9" />
            </linearGradient>
            
            {/* AI brain gradient - cool cyan/teal */}
            <linearGradient id="aiBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>

            {/* Input flow gradient (warm to cool) */}
            <linearGradient id="inputFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Output flow gradient (cool to warm) */}
            <linearGradient id="outputFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="brainGlowPink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#ec4899" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="brainGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#06b6d4" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Flow paths for animation */}
            <path id="inputPath" d="M180,120 C350,60 650,60 820,120" fill="none" />
            <path id="outputPath" d="M820,160 C650,220 350,220 180,160" fill="none" />
          </defs>

          {/* Human Brain (Left) */}
          <g transform="translate(100, 140)">
            {/* Outer glow ring */}
            <circle r="70" fill="none" stroke="#ec4899" strokeWidth="1" opacity="0.3">
              <animate attributeName="r" values="65;72;65" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
            
            {/* Brain shape - organic */}
            <path 
              d="M0,-50 C25,-55 45,-42 55,-25 C65,-5 58,20 48,35 C38,50 18,55 0,53 C-18,55 -38,50 -48,35 C-58,20 -65,-5 -55,-25 C-45,-42 -25,-55 0,-50 Z"
              fill="url(#humanBrainGrad)"
              filter="url(#brainGlowPink)"
            />
            
            {/* Brain folds/wrinkles */}
            <g stroke="#fff" strokeWidth="2" fill="none" opacity="0.4">
              <path d="M-35,-22 Q-18,-35 0,-22 Q18,-35 35,-22" />
              <path d="M-30,0 Q-12,-12 8,0 Q25,-12 40,0" />
              <path d="M-25,22 Q0,10 25,22" />
            </g>
            
            {/* Label */}
            <text y="85" textAnchor="middle" fill="#f472b6" fontSize="14" fontWeight="700">Cérebro Humano</text>
          </g>

          {/* AI Brain (Right) - CPU/Chip styled as brain */}
          <g transform="translate(900, 140)">
            {/* Outer glow ring */}
            <circle r="70" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3">
              <animate attributeName="r" values="65;72;65" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
            
            {/* Brain shape with circuits */}
            <path 
              d="M0,-50 C25,-55 45,-42 55,-25 C65,-5 58,20 48,35 C38,50 18,55 0,53 C-18,55 -38,50 -48,35 C-58,20 -65,-5 -55,-25 C-45,-42 -25,-55 0,-50 Z"
              fill="url(#aiBrainGrad)"
              filter="url(#brainGlowCyan)"
            />
            
            {/* Circuit patterns inside brain */}
            <g stroke="#0f172a" strokeWidth="2" fill="none" opacity="0.5">
              <path d="M-32,-20 L-15,-20 L-15,-8 L0,-8 L0,5 L18,5" />
              <path d="M0,-38 L0,-22 L12,-22 L12,-5" />
              <path d="M-22,12 L-5,12 L-5,28 L12,28" />
              <path d="M18,-18 L28,-18 L28,8 L38,8" />
            </g>
            
            {/* Circuit nodes */}
            <g fill="#22d3ee">
              <circle cx="-32" cy="-20" r="4">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="5" r="4">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
              </circle>
              <circle cx="12" cy="28" r="4">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="38" cy="8" r="4">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* IA Label inside */}
            <text y="8" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="900">IA</text>
            
            {/* Label below */}
            <text y="85" textAnchor="middle" fill="#22d3ee" fontSize="14" fontWeight="700">Cérebro Computacional</text>
          </g>

          {/* INPUT FLOW: Human → AI (Top arc) */}
          <g>
            {/* Flow path line */}
            <path 
              d="M180,120 C350,60 650,60 820,120" 
              fill="none" 
              stroke="url(#inputFlowGrad)" 
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.6"
            />
            
            {/* Animated dashes on path */}
            <path 
              d="M180,120 C350,60 650,60 820,120" 
              fill="none" 
              stroke="url(#inputFlowGrad)" 
              strokeWidth="2"
              strokeDasharray="12,8"
              opacity="0.8"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.5s" repeatCount="indefinite" />
            </path>

            {/* Animated MessageCircle icons with words */}
            {/* Group 1: "Palavras" + MessageCircle */}
            <g opacity="0.95">
              <animateMotion dur="5s" repeatCount="indefinite">
                <mpath href="#inputPath" />
              </animateMotion>
              <rect x="-45" y="-12" width="90" height="24" rx="12" fill="#ec4899" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">💬 Palavras</text>
            </g>
            
            {/* Group 2: "Prompts" + MessageCircle */}
            <g opacity="0.95">
              <animateMotion dur="5s" begin="1.7s" repeatCount="indefinite">
                <mpath href="#inputPath" />
              </animateMotion>
              <rect x="-42" y="-12" width="84" height="24" rx="12" fill="#a855f7" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">💬 Prompts</text>
            </g>
            
            {/* Group 3: "Dados" + MessageCircle */}
            <g opacity="0.95">
              <animateMotion dur="5s" begin="3.4s" repeatCount="indefinite">
                <mpath href="#inputPath" />
              </animateMotion>
              <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#8b5cf6" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">💬 Dados</text>
            </g>
          </g>

          {/* OUTPUT FLOW: AI → Human (Bottom arc) */}
          <g>
            {/* Flow path line */}
            <path 
              d="M820,160 C650,220 350,220 180,160" 
              fill="none" 
              stroke="url(#outputFlowGrad)" 
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.6"
            />
            
            {/* Animated dashes on path */}
            <path 
              d="M820,160 C650,220 350,220 180,160" 
              fill="none" 
              stroke="url(#outputFlowGrad)" 
              strokeWidth="2"
              strokeDasharray="12,8"
              opacity="0.8"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.5s" repeatCount="indefinite" />
            </path>

            {/* Animated Sparkles icons with words */}
            {/* Group 1: "Solução" + Sparkles */}
            <g opacity="0.95">
              <animateMotion dur="5s" repeatCount="indefinite">
                <mpath href="#outputPath" />
              </animateMotion>
              <rect x="-42" y="-12" width="84" height="24" rx="12" fill="#06b6d4" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">✨ Solução</text>
            </g>
            
            {/* Group 2: "Eficiência" + Sparkles */}
            <g opacity="0.95">
              <animateMotion dur="5s" begin="1.7s" repeatCount="indefinite">
                <mpath href="#outputPath" />
              </animateMotion>
              <rect x="-48" y="-12" width="96" height="24" rx="12" fill="#8b5cf6" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">✨ Eficiência</text>
            </g>
            
            {/* Group 3: "Valor" + Sparkles */}
            <g opacity="0.95">
              <animateMotion dur="5s" begin="3.4s" repeatCount="indefinite">
                <mpath href="#outputPath" />
              </animateMotion>
              <rect x="-32" y="-12" width="64" height="24" rx="12" fill="#22d3ee" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="600">✨ Valor</text>
            </g>
          </g>

          {/* Center decorative element */}
          <g transform="translate(500, 140)">
            <circle r="8" fill="#8b5cf6" opacity="0.8">
              <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>
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
