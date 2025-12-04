import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, FileText, Cpu, Database, ArrowRight, CheckCircle2 } from "lucide-react";

interface ETLExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ETLExplanationModal = ({ isOpen, onClose }: ETLExplanationModalProps) => {
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
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <FileText className="h-10 w-10 text-white" />
                  </div>
                </div>
                <Badge className="bg-blue-500 text-white font-bold text-sm px-4 py-1">EXTRACT</Badge>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Extração de texto do PDF
                </p>
              </div>

              {/* Arrow 1 with data flow animation */}
              <div className="flex-1 relative h-2">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-30" />
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="h-full w-8 bg-gradient-to-r from-transparent via-white to-transparent animate-[slideRight_1.5s_ease-in-out_infinite]" />
                </div>
                <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-purple-500" />
              </div>

              {/* TRANSFORM */}
              <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Cpu className="h-10 w-10 text-white animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                </div>
                <Badge className="bg-purple-500 text-white font-bold text-sm px-4 py-1">TRANSFORM</Badge>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Chunking + Embeddings
                </p>
              </div>

              {/* Arrow 2 with data flow animation */}
              <div className="flex-1 relative h-2">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-green-500 rounded-full opacity-30" />
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="h-full w-8 bg-gradient-to-r from-transparent via-white to-transparent animate-[slideRight_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }} />
                </div>
                <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-green-500" />
              </div>

              {/* LOAD */}
              <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Database className="h-10 w-10 text-white" />
                  </div>
                </div>
                <Badge className="bg-green-500 text-white font-bold text-sm px-4 py-1">LOAD</Badge>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Armazenamento no banco
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Extract Details */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
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
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
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
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
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
