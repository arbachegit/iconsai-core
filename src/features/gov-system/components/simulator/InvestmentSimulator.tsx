import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Clock, TrendingUp, Users, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import type { Municipio, MetaInvestimento } from '../../types';
import { 
  simularInvestimento, 
  formatarMoeda, 
  getIndicadoresDisponiveis 
} from '../../services/simuladorCustos';
import { CATEGORIAS } from '../../data/custosInvestimento';

interface InvestmentSimulatorProps {
  municipio: Municipio;
  onClose: () => void;
}

export const InvestmentSimulator: React.FC<InvestmentSimulatorProps> = ({
  municipio,
  onClose,
}) => {
  const indicadores = useMemo(() => getIndicadoresDisponiveis(municipio), [municipio]);
  
  const [metas, setMetas] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    indicadores.forEach(ind => {
      inicial[ind.codigo] = 0;
    });
    return inicial;
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    saude: true,
    educacao: true,
    infraestrutura: true,
    economico: false,
  });

  const metasArray: MetaInvestimento[] = useMemo(() => {
    return indicadores
      .filter(ind => metas[ind.codigo] !== 0)
      .map(ind => ({
        indicador: ind.codigo,
        valorAtual: ind.valorAtual,
        valorMeta: ind.valorAtual + metas[ind.codigo],
        variacao: metas[ind.codigo],
      }));
  }, [indicadores, metas]);

  const simulacao = useMemo(() => {
    if (metasArray.length === 0) return null;
    return simularInvestimento(municipio, metasArray);
  }, [municipio, metasArray]);

  const handleSliderChange = useCallback((codigo: string, valor: number[]) => {
    setMetas(prev => ({ ...prev, [codigo]: valor[0] }));
  }, []);

  const toggleCategoria = (categoria: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  };

  const resetMetas = () => {
    const reset: Record<string, number> = {};
    indicadores.forEach(ind => {
      reset[ind.codigo] = 0;
    });
    setMetas(reset);
  };

  // Group indicators by category
  const indicadoresPorCategoria = useMemo(() => {
    const grouped: Record<string, typeof indicadores> = {
      saude: [],
      educacao: [],
      infraestrutura: [],
      economico: [],
    };
    indicadores.forEach(ind => {
      if (grouped[ind.categoria]) {
        grouped[ind.categoria].push(ind);
      }
    });
    return grouped;
  }, [indicadores]);

  // Chart data
  const chartData = useMemo(() => {
    if (!simulacao) return [];
    return simulacao.custoPorIndicador.map(c => ({
      nome: c.label.length > 15 ? c.label.substring(0, 15) + '...' : c.label,
      custo: c.custoFinal,
      categoria: indicadores.find(i => i.codigo === c.indicador)?.categoria || 'economico',
    }));
  }, [simulacao, indicadores]);

  const getSliderConfig = (codigo: string, valorAtual: number) => {
    // Define ranges based on indicator type
    const configs: Record<string, { min: number; max: number; step: number }> = {
      mortInfantil: { min: -10, max: 0, step: 0.5 },
      esperancaVida: { min: 0, max: 5, step: 0.5 },
      leitosPor1000: { min: 0, max: 2, step: 0.1 },
      medicosPor1000: { min: 0, max: 2, step: 0.1 },
      ideb: { min: 0, max: 2, step: 0.1 },
      txAlfabetizacao: { min: 0, max: 10, step: 1 },
      aguaEncanada: { min: 0, max: Math.min(30, 100 - valorAtual), step: 1 },
      esgotoAdequado: { min: 0, max: Math.min(40, 100 - valorAtual), step: 1 },
      coletaLixo: { min: 0, max: Math.min(20, 100 - valorAtual), step: 1 },
      rendaMedia: { min: 0, max: 500, step: 50 },
      pibPerCapita: { min: 0, max: 10000, step: 500 },
    };
    return configs[codigo] || { min: 0, max: 10, step: 1 };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" />
              Simulador de Investimentos
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Defina metas de melhoria e calcule o investimento necessário
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetMetas}>
            Limpar Metas
          </Button>
        </div>
      </div>

      {/* Indicator Sliders by Category */}
      <div className="space-y-4">
        {Object.entries(indicadoresPorCategoria).map(([categoria, inds]) => {
          if (inds.length === 0) return null;
          const config = CATEGORIAS[categoria as keyof typeof CATEGORIAS];
          const isExpanded = expandedCategories[categoria];

          return (
            <div key={categoria} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggleCategoria(categoria)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="font-semibold text-foreground">{config.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {inds.length} indicadores
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-4">
                  {inds.map(ind => {
                    const sliderConfig = getSliderConfig(ind.codigo, ind.valorAtual);
                    const valorMeta = metas[ind.codigo];
                    
                    return (
                      <div key={ind.codigo} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {ind.label}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              Atual: {ind.valorAtual.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-semibold ${
                              valorMeta > 0 ? 'text-green-600' : 
                              valorMeta < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {valorMeta > 0 ? '+' : ''}{valorMeta.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {ind.unidade}
                            </span>
                          </div>
                        </div>
                        <Slider
                          value={[valorMeta]}
                          min={sliderConfig.min}
                          max={sliderConfig.max}
                          step={sliderConfig.step}
                          onValueChange={(v) => handleSliderChange(ind.codigo, v)}
                          className="cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{sliderConfig.min}</span>
                          <span>{sliderConfig.max}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Simulation Results */}
      {simulacao && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <Banknote className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-foreground">
                {formatarMoeda(simulacao.custoTotal)}
              </div>
              <div className="text-xs text-muted-foreground">Investimento Total</div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-foreground">
                {simulacao.prazoTotal}
              </div>
              <div className="text-xs text-muted-foreground">Meses de Execução</div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-foreground">
                +{(simulacao.impactoEsperado.variacaoIdhm * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Impacto no IDHM</div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-foreground">
                {simulacao.impactoEsperado.empregos.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">Empregos Gerados</div>
            </div>
          </div>

          {/* Cost Chart */}
          {chartData.length > 0 && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h4 className="font-semibold text-foreground mb-4">Custo por Indicador</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => formatarMoeda(v)}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="nome" 
                      width={120}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatarMoeda(value), 'Custo']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="custo" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORIAS[entry.categoria as keyof typeof CATEGORIAS]?.color || '#888'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Scenarios */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h4 className="font-semibold text-foreground mb-4">Cenários de Custo</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                  Otimista
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatarMoeda(simulacao.cenarios.otimista)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">-15%</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center border-2 border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                  Base
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatarMoeda(simulacao.cenarios.base)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Referência</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">
                  Pessimista
                </div>
                <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  {formatarMoeda(simulacao.cenarios.pessimista)}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">+25%</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {simulacao.cronograma.length > 0 && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h4 className="font-semibold text-foreground mb-4">Cronograma de Execução</h4>
              <div className="space-y-3">
                {simulacao.cronograma.map((fase) => (
                  <div key={fase.fase} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {fase.fase}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{fase.nome}</span>
                        <span className="text-sm text-muted-foreground">
                          Mês {fase.inicio} → {fase.fim}
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ 
                            width: `${((fase.fim - fase.inicio) / simulacao.prazoTotal) * 100}%`,
                            marginLeft: `${(fase.inicio / simulacao.prazoTotal) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-foreground">
                        {formatarMoeda(fase.custoFase)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!simulacao && (
        <div className="bg-muted/50 rounded-xl p-8 text-center">
          <Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="font-semibold text-foreground mb-2">
            Defina suas metas de melhoria
          </h4>
          <p className="text-muted-foreground text-sm">
            Use os controles acima para definir as metas de melhoria em cada indicador.
            O simulador calculará automaticamente o investimento necessário.
          </p>
        </div>
      )}
    </div>
  );
};
