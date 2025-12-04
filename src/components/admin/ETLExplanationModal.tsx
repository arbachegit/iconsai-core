import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, FileText, Cpu, Database, ArrowRight, CheckCircle2, Play, RotateCcw } from "lucide-react";

interface ETLExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ETLExplanationModal = ({ isOpen, onClose }: ETLExplanationModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'extract' | 'transform' | 'load' | 'complete'>('idle');
  const [chunks, setChunks] = useState<number[]>([]);
  const [loadedChunks, setLoadedChunks] = useState<number[]>([]);

  // Reset animation when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAnimating(false);
      setCurrentPhase('idle');
      setChunks([]);
      setLoadedChunks([]);
    }
  }, [isOpen]);

  const startAnimation = () => {
    setIsAnimating(true);
    setCurrentPhase('extract');
    setChunks([]);
    setLoadedChunks([]);

    // Phase 1: Extract (1.5s)
    setTimeout(() => {
      setCurrentPhase('transform');
      // Generate chunks one by one
      const chunkCount = 5;
      for (let i = 0; i < chunkCount; i++) {
        setTimeout(() => {
          setChunks(prev => [...prev, i]);
        }, i * 400);
      }
    }, 1500);

    // Phase 2: Transform complete, start Load (3.5s)
    setTimeout(() => {
      setCurrentPhase('load');
      // Load chunks into database
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          setLoadedChunks(prev => [...prev, i]);
        }, i * 300);
      }
    }, 3500);

    // Phase 3: Complete (5.5s)
    setTimeout(() => {
      setCurrentPhase('complete');
      setIsAnimating(false);
    }, 5500);
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setCurrentPhase('idle');
    setChunks([]);
    setLoadedChunks([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            O que é ETL? (Extract, Transform, Load)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Introduction */}
          <p className="text-muted-foreground">
            ETL é um processo fundamental em sistemas de dados que consiste em três etapas: 
            <strong className="text-foreground"> Extrair</strong> dados da fonte, 
            <strong className="text-foreground"> Transformar</strong> para o formato desejado, e 
            <strong className="text-foreground"> Carregar</strong> no destino final.
          </p>

          {/* Animation Controls */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={startAnimation} 
              disabled={isAnimating}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isAnimating ? 'Processando...' : 'Simular Pipeline'}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetAnimation}
              disabled={currentPhase === 'idle'}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
            {currentPhase !== 'idle' && (
              <Badge variant="outline" className={
                currentPhase === 'extract' ? 'bg-blue-500/20 text-blue-400 border-blue-500' :
                currentPhase === 'transform' ? 'bg-purple-500/20 text-purple-400 border-purple-500' :
                currentPhase === 'load' ? 'bg-green-500/20 text-green-400 border-green-500' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500'
              }>
                {currentPhase === 'extract' && '📄 Extraindo texto...'}
                {currentPhase === 'transform' && '⚙️ Criando chunks...'}
                {currentPhase === 'load' && '💾 Carregando no banco...'}
                {currentPhase === 'complete' && '✅ Pipeline completo!'}
              </Badge>
            )}
          </div>

          {/* Animated Diagram */}
          <div className="relative bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl p-8 overflow-hidden">
            {/* Background Grid Animation */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.1)_1px,transparent_1px)] bg-[size:20px_20px] animate-pulse" />
            </div>
            
            {/* ETL Flow */}
            <div className="relative flex items-center justify-between gap-4">
              {/* EXTRACT */}
              <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '0ms' }}>
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    currentPhase === 'extract' ? 'bg-blue-500/40 animate-ping' : 'bg-blue-500/20'
                  }`} style={{ animationDuration: '1s' }} />
                  <div className={`relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    currentPhase === 'extract' ? 'shadow-blue-500/60 scale-110' : 'shadow-blue-500/30'
                  }`}>
                    <FileText className={`h-10 w-10 text-white transition-transform duration-300 ${
                      currentPhase === 'extract' ? 'animate-bounce' : ''
                    }`} />
                  </div>
                </div>
                <Badge className={`font-bold text-sm px-4 py-1 transition-all duration-300 ${
                  currentPhase === 'extract' ? 'bg-blue-500 text-white scale-110' : 'bg-blue-500/70 text-white'
                }`}>EXTRACT</Badge>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Extração de texto do PDF
                </p>
              </div>

              {/* Arrow 1 with data flow animation */}
              <div className="flex-1 relative h-2">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-30" />
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className={`h-full w-8 bg-gradient-to-r from-transparent via-white to-transparent ${
                    currentPhase === 'extract' || currentPhase === 'transform' ? 'animate-slideRight' : 'opacity-0'
                  }`} />
                </div>
                <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-purple-500" />
              </div>

              {/* TRANSFORM */}
              <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    currentPhase === 'transform' ? 'bg-purple-500/40 animate-ping' : 'bg-purple-500/20'
                  }`} style={{ animationDuration: '1s' }} />
                  <div className={`relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    currentPhase === 'transform' ? 'shadow-purple-500/60 scale-110' : 'shadow-purple-500/30'
                  }`}>
                    <Cpu className={`h-10 w-10 text-white ${
                      currentPhase === 'transform' ? 'animate-spin' : ''
                    }`} style={{ animationDuration: '1s' }} />
                  </div>
                </div>
                <Badge className={`font-bold text-sm px-4 py-1 transition-all duration-300 ${
                  currentPhase === 'transform' ? 'bg-purple-500 text-white scale-110' : 'bg-purple-500/70 text-white'
                }`}>TRANSFORM</Badge>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Chunking + Embeddings
                </p>
              </div>

              {/* Arrow 2 with data flow animation */}
              <div className="flex-1 relative h-2">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-green-500 rounded-full opacity-30" />
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className={`h-full w-8 bg-gradient-to-r from-transparent via-white to-transparent ${
                    currentPhase === 'load' ? 'animate-slideRight' : 'opacity-0'
                  }`} style={{ animationDelay: '0.5s' }} />
                </div>
                <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-green-500" />
              </div>

              {/* LOAD */}
              <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    currentPhase === 'load' ? 'bg-green-500/40 animate-ping' : 
                    currentPhase === 'complete' ? 'bg-emerald-500/40' : 'bg-green-500/20'
                  }`} style={{ animationDuration: '1s' }} />
                  <div className={`relative w-20 h-20 bg-gradient-to-br rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    currentPhase === 'complete' ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/60 scale-110' :
                    currentPhase === 'load' ? 'from-green-500 to-green-600 shadow-green-500/60 scale-110' : 
                    'from-green-500 to-green-600 shadow-green-500/30'
                  }`}>
                    {currentPhase === 'complete' ? (
                      <CheckCircle2 className="h-10 w-10 text-white animate-bounce" />
                    ) : (
                      <Database className={`h-10 w-10 text-white ${
                        currentPhase === 'load' ? 'animate-pulse' : ''
                      }`} />
                    )}
                  </div>
                </div>
                <Badge className={`font-bold text-sm px-4 py-1 transition-all duration-300 ${
                  currentPhase === 'complete' ? 'bg-emerald-500 text-white scale-110' :
                  currentPhase === 'load' ? 'bg-green-500 text-white scale-110' : 'bg-green-500/70 text-white'
                }`}>{currentPhase === 'complete' ? 'DONE!' : 'LOAD'}</Badge>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Armazenamento no banco
                </p>
              </div>
            </div>

            {/* Chunks Visualization */}
            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Visualização de Chunks em Tempo Real</h4>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-purple-500/50 border border-purple-500" />
                    Criado
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500 border border-green-500" />
                    Carregado
                  </span>
                </div>
              </div>
              
              {/* Chunks Grid */}
              <div className="grid grid-cols-5 gap-3">
                {[0, 1, 2, 3, 4].map((index) => {
                  const isCreated = chunks.includes(index);
                  const isLoaded = loadedChunks.includes(index);
                  
                  return (
                    <div
                      key={index}
                      className={`relative h-24 rounded-lg border-2 transition-all duration-500 overflow-hidden ${
                        isLoaded 
                          ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/30' 
                          : isCreated 
                            ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30 animate-pulse' 
                            : 'bg-muted/20 border-border/30'
                      }`}
                      style={{
                        transform: isCreated ? 'scale(1)' : 'scale(0.9)',
                        opacity: isCreated ? 1 : 0.4,
                      }}
                    >
                      {/* Chunk content visualization */}
                      <div className="absolute inset-2 flex flex-col gap-1">
                        {[...Array(4)].map((_, lineIdx) => (
                          <div
                            key={lineIdx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              isLoaded 
                                ? 'bg-green-500/60' 
                                : isCreated 
                                  ? 'bg-purple-500/60' 
                                  : 'bg-muted-foreground/20'
                            }`}
                            style={{
                              width: `${60 + Math.random() * 35}%`,
                              animationDelay: `${lineIdx * 100}ms`
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Chunk label */}
                      <div className="absolute bottom-1 right-1">
                        <span className={`text-[10px] font-mono ${
                          isLoaded ? 'text-green-400' : isCreated ? 'text-purple-400' : 'text-muted-foreground/50'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      
                      {/* Loading animation */}
                      {isCreated && !isLoaded && currentPhase === 'load' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/30 to-transparent animate-slideRight" />
                      )}
                      
                      {/* Success checkmark */}
                      {isLoaded && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Stats */}
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Chunks criados:</span>
                  <span className="font-bold text-purple-400">{chunks.length}/5</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Chunks carregados:</span>
                  <span className="font-bold text-green-400">{loadedChunks.length}/5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Extract Details */}
            <div className={`border rounded-lg p-4 space-y-3 transition-all duration-300 ${
              currentPhase === 'extract' 
                ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-blue-400">1. Extract (Extrair)</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Upload do documento PDF</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Extração via pdfjs-dist</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>OCR para tabelas (Document AI)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Validação de legibilidade</span>
                </li>
              </ul>
            </div>

            {/* Transform Details */}
            <div className={`border rounded-lg p-4 space-y-3 transition-all duration-300 ${
              currentPhase === 'transform' 
                ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20' 
                : 'bg-purple-500/10 border-purple-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-purple-400">2. Transform (Transformar)</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <span>Sanitização Unicode</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <span>Chunking (1500 palavras)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <span>Geração de embeddings (1536D)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <span>Categorização automática (Tags)</span>
                </li>
              </ul>
            </div>

            {/* Load Details */}
            <div className={`border rounded-lg p-4 space-y-3 transition-all duration-300 ${
              currentPhase === 'load' || currentPhase === 'complete'
                ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-green-400">3. Load (Carregar)</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Inserção no PostgreSQL</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Indexação vetorial (pgvector)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Geração de resumo AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Atualização de analytics</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              ⚡ Métricas de Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">~2s</div>
                <div className="text-xs text-muted-foreground">Extração/página</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">1536</div>
                <div className="text-xs text-muted-foreground">Dimensões embedding</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">1500</div>
                <div className="text-xs text-muted-foreground">Palavras/chunk</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">0.15</div>
                <div className="text-xs text-muted-foreground">Threshold busca</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
