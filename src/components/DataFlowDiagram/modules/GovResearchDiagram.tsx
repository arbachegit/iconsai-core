import React, { useState, useMemo } from 'react';
import {
  Search, TrendingUp, TrendingDown, Heart, GraduationCap, BarChart3, LineChart,
  Download, ExternalLink, Info, Loader2, AlertCircle, Clock, DollarSign,
  Users, Building2, Stethoscope, BookOpen, ChevronRight, Sparkles, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { cn } from '@/lib/utils';

// Types
interface SearchResult {
  id: string;
  title: string;
  value: string;
  variation: number;
  variationLabel: string;
  source: string;
  sourceUrl: string;
  lastUpdate: string;
  category: 'economic' | 'health' | 'education';
  historicalData: { period: string; value: number }[];
  relatedData: { label: string; value: string }[];
}

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

// Mock Data
const mockResults: Record<string, SearchResult> = {
  'pib-rs': {
    id: 'pib-rs',
    title: 'PIB do Rio Grande do Sul',
    value: 'R$ 581,3 bilhões',
    variation: 3.2,
    variationLabel: '+3.2% vs ano anterior',
    source: 'IBGE - Contas Regionais',
    sourceUrl: 'https://sidra.ibge.gov.br',
    lastUpdate: '2024',
    category: 'economic',
    historicalData: [
      { period: '2019', value: 482.1 },
      { period: '2020', value: 458.7 },
      { period: '2021', value: 512.4 },
      { period: '2022', value: 548.9 },
      { period: '2023', value: 563.5 },
      { period: '2024', value: 581.3 },
    ],
    relatedData: [
      { label: 'PIB per capita', value: 'R$ 51.073' },
      { label: 'Participação no PIB nacional', value: '6.4%' },
      { label: 'Posição entre estados', value: '4º lugar' },
    ],
  },
  'desemprego-sp': {
    id: 'desemprego-sp',
    title: 'Taxa de Desemprego - São Paulo',
    value: '7.2%',
    variation: -0.3,
    variationLabel: '-0.3 p.p. vs trimestre anterior',
    source: 'PNAD Contínua - IBGE',
    sourceUrl: 'https://sidra.ibge.gov.br',
    lastUpdate: 'Q3/2024',
    category: 'economic',
    historicalData: [
      { period: 'Q1/23', value: 8.9 },
      { period: 'Q2/23', value: 8.3 },
      { period: 'Q3/23', value: 7.8 },
      { period: 'Q4/23', value: 7.4 },
      { period: 'Q1/24', value: 7.9 },
      { period: 'Q2/24', value: 7.5 },
      { period: 'Q3/24', value: 7.2 },
    ],
    relatedData: [
      { label: 'Renda média', value: 'R$ 3.120' },
      { label: 'Informalidade', value: '38.2%' },
      { label: 'População ocupada', value: '23.4M' },
    ],
  },
  'ideb-estados': {
    id: 'ideb-estados',
    title: 'IDEB - Comparativo Estados (Anos Finais)',
    value: '4.7 (média nacional)',
    variation: 0.2,
    variationLabel: '+0.2 pontos vs 2021',
    source: 'INEP - MEC',
    sourceUrl: 'https://www.gov.br/inep',
    lastUpdate: '2023',
    category: 'education',
    historicalData: [
      { period: '2015', value: 4.2 },
      { period: '2017', value: 4.4 },
      { period: '2019', value: 4.6 },
      { period: '2021', value: 4.5 },
      { period: '2023', value: 4.7 },
    ],
    relatedData: [
      { label: 'Melhor estado (CE)', value: '5.4' },
      { label: 'Meta 2025', value: '5.0' },
      { label: 'Taxa aprovação', value: '92.1%' },
    ],
  },
  'ipca': {
    id: 'ipca',
    title: 'Evolução da Inflação IPCA',
    value: '4.62% (12 meses)',
    variation: 0.52,
    variationLabel: '+0.52% no mês',
    source: 'IBGE - SIDRA',
    sourceUrl: 'https://sidra.ibge.gov.br',
    lastUpdate: 'Dezembro/2024',
    category: 'economic',
    historicalData: [
      { period: 'Jan', value: 4.51 },
      { period: 'Fev', value: 4.49 },
      { period: 'Mar', value: 4.18 },
      { period: 'Abr', value: 3.93 },
      { period: 'Mai', value: 3.74 },
      { period: 'Jun', value: 3.69 },
      { period: 'Jul', value: 4.24 },
      { period: 'Ago', value: 4.42 },
      { period: 'Set', value: 4.47 },
      { period: 'Out', value: 4.56 },
      { period: 'Nov', value: 4.58 },
      { period: 'Dez', value: 4.62 },
    ],
    relatedData: [
      { label: 'Meta Banco Central', value: '3.0% (±1.5)' },
      { label: 'Selic atual', value: '11.25%' },
      { label: 'IGP-M', value: '3.18%' },
    ],
  },
  'leitos-habitante': {
    id: 'leitos-habitante',
    title: 'Leitos Hospitalares por Habitante',
    value: '2.1 leitos/1.000 hab',
    variation: -2.4,
    variationLabel: '-2.4% vs 2019',
    source: 'DATASUS - CNES',
    sourceUrl: 'https://datasus.saude.gov.br',
    lastUpdate: 'Novembro/2024',
    category: 'health',
    historicalData: [
      { period: '2019', value: 2.15 },
      { period: '2020', value: 2.18 },
      { period: '2021', value: 2.14 },
      { period: '2022', value: 2.12 },
      { period: '2023', value: 2.10 },
      { period: '2024', value: 2.10 },
    ],
    relatedData: [
      { label: 'Leitos UTI/1.000 hab', value: '0.22' },
      { label: 'OMS recomendado', value: '3.0' },
      { label: 'Total leitos SUS', value: '423.581' },
    ],
  },
};

const suggestions = [
  { text: 'PIB do Rio Grande do Sul', resultId: 'pib-rs' },
  { text: 'Comparar IDEB entre estados', resultId: 'ideb-estados' },
  { text: 'Evolução da inflação IPCA', resultId: 'ipca' },
  { text: 'Leitos hospitalares por habitante', resultId: 'leitos-habitante' },
];

const quickFilters: QuickFilter[] = [
  { id: 'economic', label: 'Econômicos', icon: DollarSign, color: '#3b82f6' },
  { id: 'health', label: 'Saúde', icon: Heart, color: '#22c55e' },
  { id: 'education', label: 'Educação', icon: GraduationCap, color: '#f59e0b' },
];

export function GovResearchDiagram() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'results' | 'empty'>('idle');
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchState('idle');
      setCurrentResult(null);
      return;
    }

    setSearchState('searching');
    
    // Simulate API delay
    setTimeout(() => {
      // Find matching result
      const normalizedQuery = query.toLowerCase();
      let result: SearchResult | null = null;

      if (normalizedQuery.includes('pib') && normalizedQuery.includes('sul')) {
        result = mockResults['pib-rs'];
      } else if (normalizedQuery.includes('desemprego') || normalizedQuery.includes('emprego')) {
        result = mockResults['desemprego-sp'];
      } else if (normalizedQuery.includes('ideb') || normalizedQuery.includes('educação') || normalizedQuery.includes('estados')) {
        result = mockResults['ideb-estados'];
      } else if (normalizedQuery.includes('ipca') || normalizedQuery.includes('inflação') || normalizedQuery.includes('inflacao')) {
        result = mockResults['ipca'];
      } else if (normalizedQuery.includes('leitos') || normalizedQuery.includes('hospital')) {
        result = mockResults['leitos-habitante'];
      }

      if (result) {
        // Apply category filter if active
        if (activeFilters.length > 0 && !activeFilters.includes(result.category)) {
          setSearchState('empty');
          setCurrentResult(null);
        } else {
          setCurrentResult(result);
          setSearchState('results');
        }
      } else {
        setSearchState('empty');
        setCurrentResult(null);
      }
    }, 800);
  };

  const handleSuggestionClick = (suggestion: { text: string; resultId: string }) => {
    setSearchQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'economic': return DollarSign;
      case 'health': return Heart;
      case 'education': return GraduationCap;
      default: return BarChart3;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'economic': return '#3b82f6';
      case 'health': return '#22c55e';
      case 'education': return '#f59e0b';
      default: return '#8b5cf6';
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Gov Research
              </h1>
              <p className="text-sm text-slate-400">Pesquisa em dados governamentais brasileiros</p>
            </div>
          </div>
          
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
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl text-cyan-400">Como usar o Gov Research</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-slate-300">
                <p>
                  Digite perguntas em linguagem natural sobre indicadores brasileiros. 
                  O sistema buscará dados oficiais de fontes como IBGE, DATASUS, INEP e Banco Central.
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-white">Exemplos de perguntas:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>"Qual o PIB do Rio Grande do Sul?"</li>
                    <li>"Evolução da inflação IPCA em 2024"</li>
                    <li>"Comparar IDEB entre estados"</li>
                    <li>"Taxa de desemprego em São Paulo"</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-400">
                  Use os filtros rápidos para restringir os resultados por categoria.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Section */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            {/* Search Bar */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Digite sua pergunta sobre dados governamentais..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="pl-12 h-12 text-base bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 rounded-xl"
                />
              </div>
              <Button
                onClick={() => handleSearch(searchQuery)}
                disabled={searchState === 'searching'}
                className="h-12 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl"
              >
                {searchState === 'searching' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Pesquisar
                  </>
                )}
              </Button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {quickFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilters.includes(filter.id);
                return (
                  <Button
                    key={filter.id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilter(filter.id)}
                    className={cn(
                      "border-slate-600 transition-all duration-300",
                      isActive
                        ? "border-opacity-80"
                        : "bg-slate-800/50 hover:bg-slate-700"
                    )}
                    style={{
                      borderColor: isActive ? filter.color : undefined,
                      backgroundColor: isActive ? `${filter.color}20` : undefined,
                      color: isActive ? filter.color : '#e2e8f0'
                    }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {filter.label}
                  </Button>
                );
              })}
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilters([])}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Suggestions (only when idle) */}
            {searchState === 'idle' && (
              <div>
                <p className="text-sm text-slate-400 mb-2">Sugestões:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-sm"
                    >
                      <ChevronRight className="w-4 h-4 mr-1" />
                      "{suggestion.text}"
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchState === 'searching' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
              <p className="text-slate-300">Buscando dados em fontes oficiais...</p>
              <p className="text-sm text-slate-500 mt-1">IBGE, DATASUS, INEP, BCB</p>
            </CardContent>
          </Card>
        )}

        {searchState === 'empty' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <AlertCircle className="w-10 h-10 text-orange-400 mb-4" />
              <p className="text-slate-300">Nenhum resultado encontrado</p>
              <p className="text-sm text-slate-500 mt-1">Tente reformular sua pergunta ou use as sugestões acima</p>
            </CardContent>
          </Card>
        )}

        {searchState === 'results' && currentResult && (
          <div className="space-y-4">
            {/* Result Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getCategoryColor(currentResult.category)}20` }}
                    >
                      {React.createElement(getCategoryIcon(currentResult.category), {
                        className: "w-5 h-5",
                        style: { color: getCategoryColor(currentResult.category) }
                      })}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{currentResult.title}</CardTitle>
                      <p className="text-sm text-slate-400">{currentResult.source}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {currentResult.lastUpdate}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-4 mb-4">
                  <span className="text-3xl font-bold text-white">{currentResult.value}</span>
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    currentResult.variation >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {currentResult.variation >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {currentResult.variationLabel}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Gráfico
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver série histórica completa</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportar dados em CSV</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200"
                        onClick={() => window.open(currentResult.sourceUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Fonte
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Acessar fonte oficial</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            {/* Time Series Chart */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <LineChart className="w-4 h-4" />
                  Série Histórica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentResult.historicalData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#64748b" 
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Related Data */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Dados Relacionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {currentResult.relatedData.map((item, index) => (
                    <div key={index} className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                      <p className="text-lg font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span>Fontes: IBGE, DATASUS, INEP, BCB, IPEA</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Atualizado: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default GovResearchDiagram;
