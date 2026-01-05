import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, FileText, Users, Wallet, Stethoscope, Building2, Heart,
  GraduationCap, BookOpen, Landmark, DollarSign, Radio, Thermometer, Cloud,
  TrendingUp, BarChart3, PieChart, Target, Cpu, Server, Layers, ArrowRight,
  Activity, Briefcase, Scale, MapPin, Home, Zap, LineChart, Play, Pause,
  ChevronRight, Info, ExternalLink, RefreshCw, CheckCircle2, AlertCircle,
  Clock, Sparkles, MousePointer, Eye, Volume2, X, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Types
interface DataSource {
  id: string;
  name: string;
  shortName: string;
  domain: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

interface PipelineStep {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

interface Indicator {
  id: string;
  name: string;
  icon: React.ElementType;
  value: string;
}

interface KnowledgeItem {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

interface DeliveryChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

// Data Sources Configuration
const dataSources: DataSource[] = [
  // Transparência
  { id: 'portal-transparencia', name: 'Portal da Transparência', shortName: 'Transparência', domain: 'Transparência', icon: Eye, color: '#22c55e', description: 'Dados de gastos públicos federais' },
  { id: 'cgu', name: 'CGU', shortName: 'CGU', domain: 'Transparência', icon: Scale, color: '#22c55e', description: 'Controladoria-Geral da União' },
  // Social
  { id: 'cadunico', name: 'CadÚnico', shortName: 'CadÚnico', domain: 'Social', icon: Users, color: '#f59e0b', description: 'Cadastro Único para programas sociais' },
  { id: 'suas', name: 'SUAS', shortName: 'SUAS', domain: 'Social', icon: Heart, color: '#f59e0b', description: 'Sistema Único de Assistência Social' },
  { id: 'bolsa-familia', name: 'Bolsa Família', shortName: 'B.Família', domain: 'Social', icon: Wallet, color: '#f59e0b', description: 'Programa de transferência de renda' },
  // Saúde
  { id: 'datasus', name: 'DATASUS', shortName: 'DATASUS', domain: 'Saúde', icon: Stethoscope, color: '#ef4444', description: 'Departamento de Informática do SUS' },
  { id: 'cnes', name: 'CNES', shortName: 'CNES', domain: 'Saúde', icon: Building2, color: '#ef4444', description: 'Cadastro Nacional de Estabelecimentos de Saúde' },
  { id: 'sinan', name: 'SINAN', shortName: 'SINAN', domain: 'Saúde', icon: AlertCircle, color: '#ef4444', description: 'Sistema de Informação de Agravos de Notificação' },
  // Educação
  { id: 'inep', name: 'INEP', shortName: 'INEP', domain: 'Educação', icon: GraduationCap, color: '#8b5cf6', description: 'Instituto Nacional de Estudos e Pesquisas Educacionais' },
  { id: 'censo-escolar', name: 'Censo Escolar', shortName: 'C.Escolar', domain: 'Educação', icon: BookOpen, color: '#8b5cf6', description: 'Censo da Educação Básica' },
  // Finanças
  { id: 'tesouro', name: 'Tesouro Nacional', shortName: 'Tesouro', domain: 'Finanças', icon: Landmark, color: '#3b82f6', description: 'Secretaria do Tesouro Nacional' },
  { id: 'siafi', name: 'SIAFI', shortName: 'SIAFI', domain: 'Finanças', icon: Database, color: '#3b82f6', description: 'Sistema Integrado de Administração Financeira' },
  { id: 'siope', name: 'SIOPE', shortName: 'SIOPE', domain: 'Finanças', icon: DollarSign, color: '#3b82f6', description: 'Sistema de Informações sobre Orçamentos Públicos em Educação' },
  // Econômico
  { id: 'ibge-sidra', name: 'IBGE SIDRA', shortName: 'SIDRA', domain: 'Econômico', icon: BarChart3, color: '#06b6d4', description: 'Sistema IBGE de Recuperação Automática' },
  { id: 'ipeadata', name: 'IPEADATA', shortName: 'IPEA', domain: 'Econômico', icon: TrendingUp, color: '#06b6d4', description: 'Base de dados macroeconômicos do IPEA' },
  { id: 'bcb', name: 'Banco Central', shortName: 'BCB', domain: 'Econômico', icon: Landmark, color: '#06b6d4', description: 'Banco Central do Brasil' },
  // Infraestrutura
  { id: 'anatel', name: 'ANATEL', shortName: 'ANATEL', domain: 'Infraestrutura', icon: Radio, color: '#ec4899', description: 'Agência Nacional de Telecomunicações' },
  { id: 'comex', name: 'Comex Stat', shortName: 'ComexStat', domain: 'Infraestrutura', icon: Globe, color: '#ec4899', description: 'Estatísticas de Comércio Exterior' },
  // Clima
  { id: 'inmet', name: 'INMET', shortName: 'INMET', domain: 'Clima', icon: Thermometer, color: '#14b8a6', description: 'Instituto Nacional de Meteorologia' },
  { id: 'ana', name: 'ANA', shortName: 'ANA', domain: 'Clima', icon: Cloud, color: '#14b8a6', description: 'Agência Nacional de Águas' },
  // População
  { id: 'censo', name: 'IBGE Censo', shortName: 'Censo', domain: 'População', icon: Users, color: '#a855f7', description: 'Censo Demográfico' },
  { id: 'pnad', name: 'PNAD', shortName: 'PNAD', domain: 'População', icon: FileText, color: '#a855f7', description: 'Pesquisa Nacional por Amostra de Domicílios' },
];

const domains = [
  { name: 'Transparência', color: '#22c55e', count: 2 },
  { name: 'Social', color: '#f59e0b', count: 3 },
  { name: 'Saúde', color: '#ef4444', count: 3 },
  { name: 'Educação', color: '#8b5cf6', count: 2 },
  { name: 'Finanças', color: '#3b82f6', count: 3 },
  { name: 'Econômico', color: '#06b6d4', count: 3 },
  { name: 'Infraestrutura', color: '#ec4899', count: 2 },
  { name: 'Clima', color: '#14b8a6', count: 2 },
  { name: 'População', color: '#a855f7', count: 2 },
];

const pipelineSteps: PipelineStep[] = [
  { id: 'fetch', name: 'Fetch', icon: RefreshCw, description: 'Coleta dados das APIs governamentais' },
  { id: 'parse', name: 'Parse', icon: FileText, description: 'Interpreta diferentes formatos (JSON, XML, CSV)' },
  { id: 'normalize', name: 'Normalize', icon: Layers, description: 'Padroniza estrutura e nomenclatura' },
  { id: 'validate', name: 'Validate', icon: CheckCircle2, description: 'Verifica integridade e qualidade' },
  { id: 'load', name: 'Load', icon: Database, description: 'Armazena no data warehouse' },
];

const indicators: Indicator[] = [
  { id: 'populacao', name: 'População', icon: Users, value: '203M' },
  { id: 'pib', name: 'PIB Municipal', icon: DollarSign, value: '5.570' },
  { id: 'idhm', name: 'IDHM', icon: Target, value: '0.754' },
  { id: 'educacao', name: 'Educação', icon: GraduationCap, value: 'IDEB' },
  { id: 'saude', name: 'Saúde', icon: Stethoscope, value: 'SUS' },
  { id: 'emprego', name: 'Emprego', icon: Briefcase, value: '7.2%' },
  { id: 'renda', name: 'Renda', icon: Wallet, value: 'R$' },
  { id: 'saneamento', name: 'Saneamento', icon: Home, value: '84%' },
];

const knowledgeItems: KnowledgeItem[] = [
  { id: 'diagnostico', name: 'Diagnóstico', icon: Activity, description: 'Análise situacional municipal' },
  { id: 'comparativo', name: 'Análise Comparativa', icon: BarChart3, description: 'Benchmarking entre municípios' },
  { id: 'tendencias', name: 'Tendências', icon: TrendingUp, description: 'Projeções e séries históricas' },
  { id: 'alertas', name: 'Alertas', icon: AlertCircle, description: 'Notificações de anomalias' },
  { id: 'recomendacoes', name: 'Recomendações IA', icon: Sparkles, description: 'Sugestões baseadas em dados' },
];

const deliveryChannels: DeliveryChannel[] = [
  { id: 'dashboard', name: 'Dashboard', icon: PieChart, description: 'Visualização interativa' },
  { id: 'mapa', name: 'Mapa', icon: MapPin, description: 'Geolocalização de indicadores' },
  { id: 'relatorios', name: 'Relatórios PDF', icon: FileText, description: 'Documentos exportáveis' },
  { id: 'api', name: 'API REST', icon: Zap, description: 'Integração programática' },
  { id: 'voz', name: 'Agente de Voz', icon: Volume2, description: 'Consulta por voz' },
];

export function GovSystemFontesDiagram() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Animation effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % (pipelineSteps.length + 1));
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Filter sources by selected domains
  const filteredSources = selectedDomains.length === 0 
    ? dataSources 
    : dataSources.filter(s => selectedDomains.includes(s.domain));

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSourceClick = (sourceId: string) => {
    setSelectedSource(selectedSource === sourceId ? null : sourceId);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-cyan-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Gov System Fontes
              </h1>
            </div>
            <Badge 
              variant="outline" 
              className="border-green-500 text-green-400 animate-pulse flex items-center gap-1"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              LIVE
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? 'Pausar' : 'Animar'}
            </Button>
            
            <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Tutorial
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl text-cyan-400">Como funciona o Pipeline de Dados Governamentais</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-slate-300">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">1</div>
                    <div>
                      <h4 className="font-semibold text-white">Fontes de Dados</h4>
                      <p className="text-sm">22 APIs governamentais organizadas em 9 domínios: Transparência, Social, Saúde, Educação, Finanças, Econômico, Infraestrutura, Clima e População.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">2</div>
                    <div>
                      <h4 className="font-semibold text-white">Pipeline ETL</h4>
                      <p className="text-sm">5 etapas automatizadas: Fetch (coleta), Parse (interpretação), Normalize (padronização), Validate (validação) e Load (armazenamento).</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">3</div>
                    <div>
                      <h4 className="font-semibold text-white">Indicadores</h4>
                      <p className="text-sm">8 indicadores-chave calculados para todos os 5.570 municípios brasileiros.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">4</div>
                    <div>
                      <h4 className="font-semibold text-white">Conhecimento</h4>
                      <p className="text-sm">IA gera diagnósticos, análises comparativas, tendências, alertas e recomendações estratégicas.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">5</div>
                    <div>
                      <h4 className="font-semibold text-white">Entrega</h4>
                      <p className="text-sm">5 canais de entrega: Dashboard interativo, Mapas, Relatórios PDF, API REST e Agente de Voz.</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Domain Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {domains.map((domain) => (
            <Button
              key={domain.name}
              variant="outline"
              size="sm"
              onClick={() => toggleDomain(domain.name)}
              className={cn(
                "border-slate-600 transition-all duration-300",
                selectedDomains.includes(domain.name)
                  ? "bg-opacity-30 border-opacity-80"
                  : "bg-slate-800/50 hover:bg-slate-700"
              )}
              style={{
                borderColor: selectedDomains.includes(domain.name) ? domain.color : undefined,
                backgroundColor: selectedDomains.includes(domain.name) ? `${domain.color}20` : undefined,
                color: selectedDomains.includes(domain.name) ? domain.color : '#e2e8f0'
              }}
            >
              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: domain.color }} />
              {domain.name}
              <Badge variant="secondary" className="ml-2 bg-slate-700/50 text-xs">
                {domain.count}
              </Badge>
            </Button>
          ))}
          {selectedDomains.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDomains([])}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Main Flow Diagram */}
        <div className="grid grid-cols-5 gap-4">
          {/* Column 1: Data Sources */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Fontes ({filteredSources.length})
            </h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSources.map((source) => {
                const Icon = source.icon;
                const isSelected = selectedSource === source.id;
                return (
                  <Tooltip key={source.id}>
                    <TooltipTrigger asChild>
                      <Card
                        onClick={() => handleSourceClick(source.id)}
                        className={cn(
                          "p-2 bg-slate-800/50 border-slate-700 cursor-pointer transition-all duration-300",
                          "hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/10",
                          isSelected && "ring-2 ring-cyan-400 bg-slate-700/50"
                        )}
                        style={{ borderLeftColor: source.color, borderLeftWidth: '3px' }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 shrink-0" style={{ color: source.color }} />
                          <span className="text-xs text-slate-200 truncate">{source.shortName}</span>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                      <p className="font-semibold">{source.name}</p>
                      <p className="text-xs text-slate-400">{source.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Column 2: Pipeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Pipeline ETL
            </h3>
            <div className="space-y-3">
              {pipelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = isPlaying && currentStep === index;
                const isPast = isPlaying && currentStep > index;
                return (
                  <div key={step.id} className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card
                          className={cn(
                            "p-3 bg-slate-800/50 border-slate-700 transition-all duration-500",
                            isActive && "ring-2 ring-cyan-400 bg-cyan-500/20 scale-105 shadow-lg shadow-cyan-500/20",
                            isPast && "bg-green-500/10 border-green-500/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                              isActive ? "bg-cyan-500 text-white" : isPast ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"
                            )}>
                              {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{step.name}</p>
                              <p className="text-xs text-slate-400">{index + 1}/5</p>
                            </div>
                          </div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                        <p>{step.description}</p>
                      </TooltipContent>
                    </Tooltip>
                    {index < pipelineSteps.length - 1 && (
                      <div className="flex justify-center my-1">
                        <ChevronRight className={cn(
                          "w-4 h-4 rotate-90 transition-colors duration-300",
                          isPlaying && currentStep > index ? "text-green-400" : "text-slate-600"
                        )} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Indicators */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Indicadores
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {indicators.map((indicator) => {
                const Icon = indicator.icon;
                const isHighlighted = isPlaying && currentStep >= pipelineSteps.length;
                return (
                  <Tooltip key={indicator.id}>
                    <TooltipTrigger asChild>
                      <Card className={cn(
                        "p-2.5 bg-slate-800/50 border-slate-700 transition-all duration-300 hover:scale-105",
                        isHighlighted && "ring-1 ring-cyan-400/50 bg-cyan-500/10"
                      )}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-cyan-400" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-300 truncate">{indicator.name}</p>
                            <p className="text-sm font-bold text-white">{indicator.value}</p>
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 border-slate-700">
                      <p>{indicator.name}: {indicator.value}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Column 4: Knowledge */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Conhecimento
            </h3>
            <div className="space-y-2">
              {knowledgeItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Card className="p-3 bg-slate-800/50 border-slate-700 transition-all duration-300 hover:scale-105 hover:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-purple-400" />
                          </div>
                          <p className="text-sm text-slate-200">{item.name}</p>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Column 5: Delivery */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Entrega
            </h3>
            <div className="space-y-2">
              {deliveryChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <Tooltip key={channel.id}>
                    <TooltipTrigger asChild>
                      <Card className="p-3 bg-slate-800/50 border-slate-700 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/10 border-r-2 border-r-green-500">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-green-400" />
                          </div>
                          <p className="text-sm text-slate-200">{channel.name}</p>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-slate-800 border-slate-700">
                      <p>{channel.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-8 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span><strong className="text-white">22</strong> fontes de dados</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-400" />
              <span><strong className="text-white">5.570</strong> municípios</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span><strong className="text-white">203M</strong> brasileiros</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Atualizado: <strong className="text-white">Tempo Real</strong></span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default GovSystemFontesDiagram;
