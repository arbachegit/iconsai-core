import React, { useMemo } from 'react';
import { Heart, GraduationCap, Building, TrendingUp, AlertTriangle, Trophy, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import type { Municipio, DiagnosticoMunicipal } from '../../types';
import { gerarDiagnostico, getClassificacaoColor, getClassificacaoLabel } from '../../services/diagnosticoMunicipal';
import { formatarMoeda } from '../../services/simuladorCustos';

interface MunicipalDiagnosisProps {
  municipio: Municipio;
  onOpenSimulator: () => void;
}

const CATEGORIA_CONFIG = {
  saude: { label: 'Saúde', icon: Heart, color: '#EF4444' },
  educacao: { label: 'Educação', icon: GraduationCap, color: '#3B82F6' },
  infraestrutura: { label: 'Infraestrutura', icon: Building, color: '#F59E0B' },
  economico: { label: 'Econômico', icon: TrendingUp, color: '#10B981' },
};

export const MunicipalDiagnosis: React.FC<MunicipalDiagnosisProps> = ({
  municipio,
  onOpenSimulator,
}) => {
  const diagnostico = useMemo(() => gerarDiagnostico(municipio), [municipio]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    return Object.entries(diagnostico.mediaPorCategoria).map(([categoria, valor]) => ({
      categoria: CATEGORIA_CONFIG[categoria as keyof typeof CATEGORIA_CONFIG].label,
      valor: Math.max(0, Math.min(100, 50 + valor * 20)), // Convert z-score to 0-100 scale
      fullMark: 100,
    }));
  }, [diagnostico]);

  const getScoreColor = (score: number) => {
    if (score >= 1) return 'text-green-600';
    if (score >= 0) return 'text-blue-600';
    if (score >= -1) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header with overall score */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">Diagnóstico Municipal</h3>
            <p className="text-muted-foreground text-sm">
              Análise comparativa com municípios similares
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Ranking no Estado</div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-foreground">
                {diagnostico.rankingEstado}º
              </span>
              <span className="text-muted-foreground">
                / {diagnostico.totalMunicipiosEstado}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const score = diagnostico.mediaPorCategoria[key as keyof typeof diagnostico.mediaPorCategoria];
            
            return (
              <div 
                key={key}
                className="bg-muted/50 rounded-lg p-4 text-center"
              >
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: config.color }} />
                <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                  {score > 0 ? '+' : ''}{score.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">{config.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h4 className="font-semibold text-foreground mb-4">Perfil Comparativo</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="categoria" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Radar
                name="Município"
                dataKey="valor"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(0)}%`, 'Percentil']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Z-Score Cards by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(diagnostico.scores).map(([categoria, scores]) => {
          if (scores.length === 0) return null;
          const config = CATEGORIA_CONFIG[categoria as keyof typeof CATEGORIA_CONFIG];
          const Icon = config.icon;

          return (
            <div 
              key={categoria}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" style={{ color: config.color }} />
                <h4 className="font-semibold text-foreground">{config.label}</h4>
              </div>
              <div className="space-y-3">
                {scores.map((score) => (
                  <div key={score.indicador} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{score.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {typeof score.valor === 'number' && score.valor < 10 
                            ? score.valor.toFixed(2) 
                            : score.valor.toLocaleString('pt-BR')}
                        </span>
                        <Badge 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${getClassificacaoColor(score.classificacao)}20`,
                            color: getClassificacaoColor(score.classificacao),
                          }}
                        >
                          {getClassificacaoLabel(score.classificacao)}
                        </Badge>
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full rounded-full transition-all"
                        style={{ 
                          width: `${score.percentil}%`,
                          backgroundColor: getClassificacaoColor(score.classificacao),
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      Percentil {score.percentil}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gap Analysis */}
      {diagnostico.gaps.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-foreground">Análise de Gaps</h4>
            </div>
            <button
              onClick={onOpenSimulator}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Simular Investimento →
            </button>
          </div>
          
          <div className="space-y-3">
            {diagnostico.gaps.slice(0, 5).map((gap) => (
              <div 
                key={gap.indicador}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    gap.prioridade === 'alta' ? 'bg-red-500' :
                    gap.prioridade === 'media' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <div className="font-medium text-foreground">{gap.label}</div>
                    <div className="text-sm text-muted-foreground">
                      Atual: {gap.valorAtual.toFixed(1)} → Meta: {gap.valorMeta.toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-600">
                    +{gap.gapPercentual.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Est. {formatarMoeda(gap.custoEstimado)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Municipalities */}
      {diagnostico.similares.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h4 className="font-semibold text-foreground mb-4">Municípios Similares</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {diagnostico.similares.slice(0, 5).map((similar) => (
              <div 
                key={similar.codigoIbge}
                className="p-3 bg-muted/50 rounded-lg text-center"
              >
                <div className="font-medium text-sm text-foreground truncate">
                  {similar.nome}
                </div>
                <div className="text-xs text-muted-foreground">{similar.ufSigla}</div>
                <div className="mt-1 text-xs">
                  <span className="font-semibold text-primary">{similar.idhm.toFixed(3)}</span>
                  <span className="text-muted-foreground"> IDHM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
