import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCcw, Shield, Zap, Database, Share2, Headphones, Play, Pause, Square, Download, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export const DynamicSLMArchitectureDiagram = () => {
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { transferToFloating } = useAudioPlayer();

  const AUDIO_URL = "https://gmflpmcepempcygdrayv.supabase.co/storage/v1/object/public/tooltip-audio/audio-contents/bc4eff8f-6306-415b-a86b-88298ad56e59.mp3";
  const AUDIO_TITLE = "🔒 O Segredo da Produtividade Duplicada: SLMs, Paredes de Titânio e o Orquestrador de Dados";

  // Transfer audio to floating player on unmount if playing
  useEffect(() => {
    return () => {
      if (audioRef.current && (audioRef.current.paused === false || audioRef.current.currentTime > 0)) {
        transferToFloating(AUDIO_TITLE, AUDIO_URL, audioRef.current);
      }
    };
  }, [transferToFloating]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleReset = () => {
    setZoom(100);
    setAnimationKey(prev => prev + 1);
  };

  const handleAudioPlayPause = async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(AUDIO_URL);
      audioRef.current.onended = () => setAudioState('idle');
      audioRef.current.oncanplaythrough = () => {
        setAudioState('playing');
        audioRef.current?.play();
      };
    }

    if (audioState === 'idle' || audioState === 'paused') {
      setAudioState('loading');
      if (audioRef.current.readyState >= 3) {
        setAudioState('playing');
        audioRef.current.play();
      } else {
        audioRef.current.load();
      }
    } else if (audioState === 'playing') {
      audioRef.current.pause();
      setAudioState('paused');
    }
  };

  const handleAudioStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current = null;
    }
    setAudioState('idle');
  };

  const handleAudioDownload = () => {
    const link = document.createElement('a');
    link.href = AUDIO_URL;
    link.download = 'segredo-produtividade-duplicada.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Sistema Dinâmico - SLM Modular</h2>
          <p className="text-muted-foreground mt-1">
            Visualização animada do fluxo de segurança e compartilhamento de conhecimento
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Player */}
          <TooltipProvider>
            <div className="flex items-center gap-2 bg-card border border-primary/30 rounded-lg px-3 py-2">
              <Headphones className="h-4 w-4 text-primary shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium max-w-[140px] truncate cursor-default">
                    {AUDIO_TITLE}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {AUDIO_TITLE}
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handleAudioPlayPause} className="h-8 w-8">
                  {audioState === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {audioState === 'playing' && <Pause className="h-4 w-4 text-primary" />}
                  {(audioState === 'idle' || audioState === 'paused') && <Play className="h-4 w-4 text-primary" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAudioStop} 
                  disabled={audioState === 'idle'}
                  className="h-8 w-8"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleAudioDownload} className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TooltipProvider>
        
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
      </div>

      {/* Legend */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-muted-foreground">Fluxo Cliente A</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-muted-foreground">Fluxo Cliente B</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground">Compartilhamento de Padrões</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              <span className="text-muted-foreground">Barreira de Isolamento</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main SVG Diagram */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div 
            className="relative overflow-auto"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <svg 
              key={animationKey}
              viewBox="0 0 900 750" 
              className="w-full h-auto min-h-[650px]"
              style={{ minWidth: '800px' }}
            >
              {/* Embedded CSS Animations */}
              <style>{`
                @keyframes securityFlowA {
                  0% { offset-distance: 0%; opacity: 0; }
                  5% { opacity: 1; }
                  95% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes securityFlowB {
                  0% { offset-distance: 0%; opacity: 0; }
                  5% { opacity: 1; }
                  95% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes productivityFlow {
                  0% { offset-distance: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes slmPulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.02); }
                }
                @keyframes storagePulse {
                  0%, 100% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)); }
                  50% { filter: drop-shadow(0 0 25px rgba(251, 191, 36, 0.9)); }
                }
                @keyframes shieldFlicker {
                  0%, 100% { stroke-opacity: 0.4; stroke-dashoffset: 0; }
                  50% { stroke-opacity: 1; stroke-dashoffset: 8; }
                }
                @keyframes energyGradient {
                  0% { stroke-dashoffset: 20; }
                  100% { stroke-dashoffset: 0; }
                }
                @keyframes glowPulse {
                  0%, 100% { opacity: 0.5; }
                  50% { opacity: 1; }
                }
                .security-dot-a {
                  offset-path: path('M180 120 L180 200 L180 280 L180 440');
                  animation: securityFlowA 2s ease-in-out infinite;
                }
                .security-dot-b {
                  offset-path: path('M720 120 L720 200 L720 280 L720 440');
                  animation: securityFlowB 2s ease-in-out infinite 0.5s;
                }
                .productivity-dot-a {
                  offset-path: path('M180 560 L180 640 L450 640 L450 380');
                  animation: productivityFlow 3.5s ease-in-out infinite 1s;
                }
                .productivity-dot-b {
                  offset-path: path('M720 560 L720 640 L450 640 L450 380');
                  animation: productivityFlow 3.5s ease-in-out infinite 1.5s;
                }
                .slm-box {
                  animation: slmPulse 1.5s ease-in-out infinite;
                  transform-origin: center;
                }
                .storage-box {
                  animation: storagePulse 2s ease-in-out infinite;
                }
                .shield-line {
                  animation: shieldFlicker 1s ease-in-out infinite;
                }
                .energy-line {
                  animation: energyGradient 1s linear infinite;
                }
                .glow-effect {
                  animation: glowPulse 2s ease-in-out infinite;
                }
              `}</style>

              {/* Definitions */}
              <defs>
                <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowGold" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(271, 91%, 65%)" />
                  <stop offset="100%" stopColor="hsl(271, 91%, 45%)" />
                </linearGradient>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(142, 76%, 50%)" />
                  <stop offset="100%" stopColor="hsl(142, 76%, 36%)" />
                </linearGradient>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(38, 92%, 55%)" />
                  <stop offset="100%" stopColor="hsl(38, 92%, 45%)" />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(200, 90%, 55%)" />
                  <stop offset="100%" stopColor="hsl(200, 90%, 40%)" />
                </linearGradient>
              </defs>

              {/* Background Grid */}
              <g opacity="0.08">
                {Array.from({ length: 20 }).map((_, i) => (
                  <line 
                    key={`v-${i}`} 
                    x1={i * 45} 
                    y1="0" 
                    x2={i * 45} 
                    y2="750" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 17 }).map((_, i) => (
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

              {/* ===== CLIENTE A (Purple) ===== */}
              <g filter="url(#glowPurple)">
                <rect 
                  x="80" y="40" width="200" height="70" rx="12" 
                  fill="hsl(271, 91%, 65%, 0.25)" 
                  stroke="hsl(271, 91%, 65%)" 
                  strokeWidth="2.5"
                />
                <text x="180" y="70" textAnchor="middle" fill="hsl(271, 91%, 70%)" fontSize="18" fontWeight="700">Cliente A</text>
                <text x="180" y="95" textAnchor="middle" fill="hsl(271, 91%, 60%)" fontSize="12">company_id: A</text>
              </g>

              {/* ===== CLIENTE B (Green) ===== */}
              <g filter="url(#glowGreen)">
                <rect 
                  x="620" y="40" width="200" height="70" rx="12" 
                  fill="hsl(142, 76%, 50%, 0.25)" 
                  stroke="hsl(142, 76%, 50%)" 
                  strokeWidth="2.5"
                />
                <text x="720" y="70" textAnchor="middle" fill="hsl(142, 76%, 60%)" fontSize="18" fontWeight="700">Cliente B</text>
                <text x="720" y="95" textAnchor="middle" fill="hsl(142, 76%, 45%)" fontSize="12">company_id: B</text>
              </g>

              {/* ===== Connection Lines from Clients to RAG ===== */}
              <path 
                d="M180 110 L180 160" 
                fill="none" 
                stroke="hsl(271, 91%, 65%)" 
                strokeWidth="3" 
                strokeDasharray="8,4"
                className="energy-line"
              />
              <path 
                d="M720 110 L720 160" 
                fill="none" 
                stroke="hsl(142, 76%, 50%)" 
                strokeWidth="3" 
                strokeDasharray="8,4"
                className="energy-line"
              />

              {/* ===== RAG-Adaptador-A (Purple) ===== */}
              <g>
                <rect 
                  x="60" y="160" width="240" height="100" rx="12" 
                  fill="hsl(271, 91%, 65%, 0.15)" 
                  stroke="hsl(271, 91%, 55%)" 
                  strokeWidth="2"
                />
                <text x="180" y="195" textAnchor="middle" fill="hsl(271, 91%, 70%)" fontSize="16" fontWeight="600">RAG-Adaptador-A</text>
                <text x="180" y="220" textAnchor="middle" fill="hsl(271, 91%, 55%)" fontSize="11">Filtro de Conteúdo</text>
                <text x="180" y="240" textAnchor="middle" fill="hsl(271, 91%, 55%)" fontSize="11">e Contexto</text>
              </g>

              {/* ===== RAG-Adaptador-B (Green) ===== */}
              <g>
                <rect 
                  x="600" y="160" width="240" height="100" rx="12" 
                  fill="hsl(142, 76%, 50%, 0.15)" 
                  stroke="hsl(142, 76%, 40%)" 
                  strokeWidth="2"
                />
                <text x="720" y="195" textAnchor="middle" fill="hsl(142, 76%, 60%)" fontSize="16" fontWeight="600">RAG-Adaptador-B</text>
                <text x="720" y="220" textAnchor="middle" fill="hsl(142, 76%, 45%)" fontSize="11">Filtro de Conteúdo</text>
                <text x="720" y="240" textAnchor="middle" fill="hsl(142, 76%, 45%)" fontSize="11">e Contexto</text>
              </g>

              {/* ===== Connection Lines from RAG to Storage ===== */}
              <path 
                d="M180 260 L180 310 L350 310" 
                fill="none" 
                stroke="hsl(271, 91%, 55%)" 
                strokeWidth="2.5" 
                strokeDasharray="6,3"
                className="energy-line"
              />
              <path 
                d="M720 260 L720 310 L550 310" 
                fill="none" 
                stroke="hsl(142, 76%, 45%)" 
                strokeWidth="2.5" 
                strokeDasharray="6,3"
                className="energy-line"
              />

              {/* ===== ARMAZENAMENTO VETORIAL GLOBAL (Gold) ===== */}
              <g className="storage-box" filter="url(#glowGold)">
                <rect 
                  x="250" y="280" width="400" height="100" rx="16" 
                  fill="hsl(38, 92%, 50%, 0.25)" 
                  stroke="url(#goldGradient)" 
                  strokeWidth="3"
                />
                <text x="450" y="315" textAnchor="middle" fill="hsl(38, 92%, 60%)" fontSize="18" fontWeight="700">Armazenamento Vetorial Global</text>
                <text x="450" y="345" textAnchor="middle" fill="hsl(38, 92%, 50%)" fontSize="13">Base de Conhecimento Compartilhada</text>
                <text x="450" y="365" textAnchor="middle" fill="hsl(38, 92%, 45%)" fontSize="11" fontStyle="italic">Padrões Anônimos &amp; Semânticos</text>
              </g>

              {/* ===== Connection Lines from Storage to SLMs ===== */}
              <path 
                d="M350 380 L350 420 L180 420 L180 460" 
                fill="none" 
                stroke="hsl(200, 90%, 50%)" 
                strokeWidth="2.5" 
                strokeDasharray="6,3"
                className="energy-line"
              />
              <path 
                d="M550 380 L550 420 L720 420 L720 460" 
                fill="none" 
                stroke="hsl(200, 90%, 50%)" 
                strokeWidth="2.5" 
                strokeDasharray="6,3"
                className="energy-line"
              />

              {/* ===== SLM-Inferência-A (Blue) ===== */}
              <g className="slm-box" filter="url(#glowBlue)">
                <rect 
                  x="50" y="460" width="260" height="110" rx="14" 
                  fill="hsl(200, 90%, 50%, 0.2)" 
                  stroke="url(#blueGradient)" 
                  strokeWidth="3"
                />
                <text x="180" y="495" textAnchor="middle" fill="hsl(200, 90%, 65%)" fontSize="17" fontWeight="700">SLM-Inferência-A</text>
                <text x="180" y="520" textAnchor="middle" fill="hsl(200, 90%, 55%)" fontSize="13">SLM Hiperfocada</text>
                <text x="180" y="545" textAnchor="middle" fill="hsl(200, 90%, 50%)" fontSize="12" fontWeight="600">(Latência &lt; 5ms)</text>
                
                {/* Pulse indicator */}
                <circle cx="290" cy="480" r="8" fill="hsl(200, 90%, 50%)" className="glow-effect">
                  <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* ===== SLM-Inferência-B (Blue) ===== */}
              <g className="slm-box" filter="url(#glowBlue)">
                <rect 
                  x="590" y="460" width="260" height="110" rx="14" 
                  fill="hsl(200, 90%, 50%, 0.2)" 
                  stroke="url(#blueGradient)" 
                  strokeWidth="3"
                />
                <text x="720" y="495" textAnchor="middle" fill="hsl(200, 90%, 65%)" fontSize="17" fontWeight="700">SLM-Inferência-B</text>
                <text x="720" y="520" textAnchor="middle" fill="hsl(200, 90%, 55%)" fontSize="13">SLM Hiperfocada</text>
                <text x="720" y="545" textAnchor="middle" fill="hsl(200, 90%, 50%)" fontSize="12" fontWeight="600">(Latência &lt; 5ms)</text>
                
                {/* Pulse indicator */}
                <circle cx="830" cy="480" r="8" fill="hsl(200, 90%, 50%)" className="glow-effect">
                  <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
                </circle>
              </g>

              {/* ===== ISOLATION BARRIER (Red Dashed Line) ===== */}
              <g>
                {/* Main barrier line */}
                <line 
                  x1="450" y1="440" x2="450" y2="590" 
                  stroke="hsl(0, 85%, 55%)" 
                  strokeWidth="4" 
                  strokeDasharray="12,6"
                  className="shield-line"
                  filter="url(#glowRed)"
                />
                
                {/* Shield icon background */}
                <rect 
                  x="420" y="495" width="60" height="40" rx="8" 
                  fill="hsl(0, 85%, 15%)" 
                  stroke="hsl(0, 85%, 55%)" 
                  strokeWidth="2"
                />
                <text x="450" y="510" textAnchor="middle" fill="hsl(0, 85%, 60%)" fontSize="16">🔒</text>
                <text x="450" y="528" textAnchor="middle" fill="hsl(0, 85%, 55%)" fontSize="8" fontWeight="600">ISOLADO</text>
                
                {/* Barrier annotations */}
                <text x="365" y="605" textAnchor="middle" fill="hsl(0, 70%, 55%)" fontSize="10" fontWeight="500">Dados A</text>
                <text x="535" y="605" textAnchor="middle" fill="hsl(0, 70%, 55%)" fontSize="10" fontWeight="500">Dados B</text>
              </g>

              {/* ===== PRODUCTIVITY FLOW (Green return arrows) ===== */}
              <path 
                d="M180 570 L180 670 L350 670" 
                fill="none" 
                stroke="hsl(142, 76%, 45%)" 
                strokeWidth="2" 
                strokeDasharray="5,3"
                opacity="0.7"
              />
              <path 
                d="M720 570 L720 670 L550 670" 
                fill="none" 
                stroke="hsl(142, 76%, 45%)" 
                strokeWidth="2" 
                strokeDasharray="5,3"
                opacity="0.7"
              />
              <path 
                d="M350 670 L450 670 L450 400" 
                fill="none" 
                stroke="hsl(142, 76%, 50%)" 
                strokeWidth="2.5" 
                strokeDasharray="5,3"
                opacity="0.8"
              />
              <path 
                d="M550 670 L450 670" 
                fill="none" 
                stroke="hsl(142, 76%, 50%)" 
                strokeWidth="2.5" 
                strokeDasharray="5,3"
                opacity="0.8"
              />

              {/* Productivity label */}
              <g>
                <rect x="350" y="690" width="200" height="35" rx="8" fill="hsl(142, 76%, 30%, 0.3)" stroke="hsl(142, 76%, 45%)" strokeWidth="1.5" />
                <text x="450" y="713" textAnchor="middle" fill="hsl(142, 76%, 55%)" fontSize="12" fontWeight="600">↑ Compartilhamento de Padrões</text>
              </g>

              {/* ===== ANIMATED DATA PACKETS ===== */}
              
              {/* Security Flow A - Purple circles going down */}
              <circle r="8" fill="hsl(271, 91%, 65%)" filter="url(#glowPurple)" className="security-dot-a" />
              <circle r="8" fill="hsl(271, 91%, 65%)" filter="url(#glowPurple)" className="security-dot-a" style={{ animationDelay: '0.7s' }} />
              <circle r="8" fill="hsl(271, 91%, 65%)" filter="url(#glowPurple)" className="security-dot-a" style={{ animationDelay: '1.4s' }} />
              
              {/* Security Flow B - Green circles going down */}
              <circle r="8" fill="hsl(142, 76%, 50%)" filter="url(#glowGreen)" className="security-dot-b" />
              <circle r="8" fill="hsl(142, 76%, 50%)" filter="url(#glowGreen)" className="security-dot-b" style={{ animationDelay: '0.8s' }} />
              <circle r="8" fill="hsl(142, 76%, 50%)" filter="url(#glowGreen)" className="security-dot-b" style={{ animationDelay: '1.6s' }} />
              
              {/* Productivity Flow A - Light green circles going up */}
              <circle r="6" fill="hsl(160, 84%, 50%)" className="productivity-dot-a" />
              <circle r="6" fill="hsl(160, 84%, 50%)" className="productivity-dot-a" style={{ animationDelay: '1.75s' }} />
              
              {/* Productivity Flow B - Light green circles going up */}
              <circle r="6" fill="hsl(160, 84%, 50%)" className="productivity-dot-b" />
              <circle r="6" fill="hsl(160, 84%, 50%)" className="productivity-dot-b" style={{ animationDelay: '2.25s' }} />

            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-purple-400" />
              <h4 className="font-semibold text-purple-300">Segurança Total</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Isolamento completo entre SLMs</li>
              <li>• Dados nunca cruzam barreiras</li>
              <li>• Inferência dedicada por cliente</li>
              <li>• Zero vazamento de informação</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-amber-400" />
              <h4 className="font-semibold text-amber-300">Base Compartilhada</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Conhecimento centralizado</li>
              <li>• Padrões anônimos e semânticos</li>
              <li>• Enriquecimento mútuo</li>
              <li>• Eficiência de armazenamento</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-cyan-400" />
              <h4 className="font-semibold text-cyan-300">Hiperfoco</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Latência &lt; 5ms por inferência</li>
              <li>• SLM especializada por contexto</li>
              <li>• Respostas ultra-precisas</li>
              <li>• Escalabilidade horizontal</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DynamicSLMArchitectureDiagram;
