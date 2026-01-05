import React from 'react';
import { 
  Banknote, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  Target,
  BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import type { PlanoInvestimento } from '../types';
import { formatarMoeda } from '../services/comparacaoCidades';

interface InvestmentPlanViewProps {
  plano: PlanoInvestimento;
}

const CATEGORIA_CORES: Record<string, string> = {
  saude: 'hsl(0, 84%, 60%)',
  educacao: 'hsl(217, 91%, 60%)',
  infraestrutura: 'hsl(38, 92%, 50%)',
  economico: 'hsl(158, 64%, 52%)',
};

const CATEGORIA_LABELS: Record<string, string> = {
  saude: 'Saúde',
  educacao: 'Educação',
  infraestrutura: 'Infraestrutura',
  economico: 'Econômico',
};

export const InvestmentPlanView: React.FC<InvestmentPlanViewProps> = ({ plano }) => {
  const chartData = plano.gaps.map(gap => ({
    nome: gap.label.length > 12 ? gap.label.substring(0, 12) + '...' : gap.label,
    custo: gap.custoEstimado,
    categoria: gap.categoria,
  }));

  const custosPorCategoria = plano.gaps.reduce((acc, gap) => {
    acc[gap.categoria] = (acc[gap.categoria] || 0) + gap.custoEstimado;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header - Origin to Model */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-sm text-muted-foreground mb-1">Cidade Atual</p>
            <p className="text-xl font-bold">{plano.cidadeOrigem.nome}</p>
            <Badge variant="outline" className="mt-1">IDHM {plano.cidadeOrigem.idhm.toFixed(3)}</Badge>
          </div>
          
          <div className="px-6">
            <ArrowRight className="w-8 h-8 text-primary" />
          </div>
          
          <div className="text-center flex-1">
            <p className="text-sm text-muted-foreground mb-1">Cidade Modelo</p>
            <p className="text-xl font-bold">{plano.cidadeModelo.cidade.nome}</p>
            <Badge className="mt-1 bg-primary">
              IDHM {plano.cidadeModelo.cidade.idhm.toFixed(3)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <Banknote className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-green-600">
            {formatarMoeda(plano.custoTotal)}
          </p>
          <p className="text-sm text-muted-foreground">Investimento Total</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <Clock className="w-6 h-6 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-blue-600">
            {plano.prazoMeses}
          </p>
          <p className="text-sm text-muted-foreground">Meses Estimados</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <TrendingUp className="w-6 h-6 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-purple-600">
            +{(plano.impactoIdhmEsperado * 100).toFixed(2)}%
          </p>
          <p className="text-sm text-muted-foreground">Impacto no IDHM</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <Target className="w-6 h-6 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-orange-600">
            {plano.gaps.length}
          </p>
          <p className="text-sm text-muted-foreground">Indicadores a Melhorar</p>
        </div>
      </div>

      {/* Cost by Category */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">Investimento por Categoria</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(custosPorCategoria).map(([categoria, custo]) => (
            <div
              key={categoria}
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: `${CATEGORIA_CORES[categoria]}20` }}
            >
              <p className="font-bold" style={{ color: CATEGORIA_CORES[categoria] }}>
                {formatarMoeda(custo)}
              </p>
              <p className="text-xs text-muted-foreground">
                {CATEGORIA_LABELS[categoria]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Gap Details */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="font-semibold mb-4">Detalhamento dos Gaps</h4>
        <div className="space-y-3">
          {plano.gaps.map((gap) => (
            <div key={gap.indicador} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORIA_CORES[gap.categoria] }}
                  />
                  <span className="font-medium">{gap.label}</span>
                  <Badge
                    variant={gap.prioridade === 'alta' ? 'destructive' : gap.prioridade === 'media' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {gap.prioridade}
                  </Badge>
                </div>
                <span className="font-semibold text-primary">{formatarMoeda(gap.custoEstimado)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  Atual: {gap.valorOrigem.toFixed(2)}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Meta: {gap.valorDestino.toFixed(2)}
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  Gap: +{gap.gapPercentual.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={Math.min(100, gap.gapPercentual)} className="h-1 mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Cost Chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <h4 className="font-semibold mb-4">Custo por Indicador</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatarMoeda(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11 }} />
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
                    <Cell key={`cell-${index}`} fill={CATEGORIA_CORES[entry.categoria]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Scenarios */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="font-semibold mb-4">Cenários de Custo</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Otimista</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatarMoeda(plano.cenarios.otimista)}
            </p>
            <p className="text-xs text-muted-foreground">-15%</p>
          </div>
          <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Base</span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {formatarMoeda(plano.cenarios.base)}
            </p>
            <p className="text-xs text-muted-foreground">Referência</p>
          </div>
          <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Pessimista</span>
            </div>
            <p className="text-xl font-bold text-orange-600">
              {formatarMoeda(plano.cenarios.pessimista)}
            </p>
            <p className="text-xs text-muted-foreground">+25%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
