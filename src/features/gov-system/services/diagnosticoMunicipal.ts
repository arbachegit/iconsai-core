import type { Municipio, ZScoreResult, GapAnalysis, DiagnosticoMunicipal, ClassificacaoZScore } from '../types';
import { getMunicipiosSimilares, MUNICIPIOS_POR_UF } from '../data/municipiosBrasil';
import { CUSTOS_POR_INDICADOR, calcularCustoIndicador } from '../data/custosInvestimento';

// Indicator definitions with metadata
const INDICADORES_CONFIG: Record<string, {
  label: string;
  categoria: 'saude' | 'educacao' | 'infraestrutura' | 'economico';
  maiorMelhor: boolean;
  unidade: string;
}> = {
  esperancaVida: { label: 'Esperança de Vida', categoria: 'saude', maiorMelhor: true, unidade: 'anos' },
  mortInfantil: { label: 'Mortalidade Infantil', categoria: 'saude', maiorMelhor: false, unidade: 'por 1000' },
  leitosPor1000: { label: 'Leitos por 1.000 hab', categoria: 'saude', maiorMelhor: true, unidade: 'leitos' },
  medicosPor1000: { label: 'Médicos por 1.000 hab', categoria: 'saude', maiorMelhor: true, unidade: 'médicos' },
  ideb: { label: 'IDEB', categoria: 'educacao', maiorMelhor: true, unidade: 'pontos' },
  txAlfabetizacao: { label: 'Taxa de Alfabetização', categoria: 'educacao', maiorMelhor: true, unidade: '%' },
  aguaEncanada: { label: 'Água Encanada', categoria: 'infraestrutura', maiorMelhor: true, unidade: '%' },
  esgotoAdequado: { label: 'Esgoto Adequado', categoria: 'infraestrutura', maiorMelhor: true, unidade: '%' },
  coletaLixo: { label: 'Coleta de Lixo', categoria: 'infraestrutura', maiorMelhor: true, unidade: '%' },
  pibPerCapita: { label: 'PIB per Capita', categoria: 'economico', maiorMelhor: true, unidade: 'R$' },
  rendaMedia: { label: 'Renda Média', categoria: 'economico', maiorMelhor: true, unidade: 'R$' },
  idhm: { label: 'IDHM', categoria: 'economico', maiorMelhor: true, unidade: '' },
};

// Calculate Z-Score
export function calcularZScore(valor: number, media: number, desvioPadrao: number): number {
  if (desvioPadrao === 0) return 0;
  return (valor - media) / desvioPadrao;
}

// Classify Z-Score into categories
export function classificarZScore(zScore: number, maiorMelhor: boolean): ClassificacaoZScore {
  const score = maiorMelhor ? zScore : -zScore;
  
  if (score <= -2) return 'critico';
  if (score <= -1) return 'abaixo';
  if (score <= 1) return 'na_media';
  if (score <= 2) return 'acima';
  return 'excelente';
}

// Convert Z-Score to percentile
export function zScoreToPercentil(zScore: number): number {
  // Approximation using cumulative normal distribution
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = zScore < 0 ? -1 : 1;
  const z = Math.abs(zScore) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  
  return Math.round((0.5 * (1.0 + sign * y)) * 100);
}

// Get all municipalities for statistics
function getAllMunicipios(): Municipio[] {
  const todos: Municipio[] = [];
  Object.values(MUNICIPIOS_POR_UF).forEach(ufs => {
    ufs.forEach(m => todos.push(m));
  });
  return todos;
}

// Calculate statistics for an indicator across all municipalities
function calcularEstatisticas(indicador: string): { media: number; desvioPadrao: number } {
  const todos = getAllMunicipios();
  const valores = todos
    .map(m => m[indicador as keyof Municipio] as number)
    .filter(v => v !== undefined && v !== null && !isNaN(v));

  if (valores.length === 0) return { media: 0, desvioPadrao: 1 };

  const media = valores.reduce((sum, v) => sum + v, 0) / valores.length;
  const variancia = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valores.length;
  const desvioPadrao = Math.sqrt(variancia);

  return { media, desvioPadrao: desvioPadrao || 1 };
}

// Calculate Z-Score for a single indicator
function calcularZScoreIndicador(municipio: Municipio, indicador: string): ZScoreResult | null {
  const config = INDICADORES_CONFIG[indicador];
  if (!config) return null;

  const valor = municipio[indicador as keyof Municipio] as number;
  if (valor === undefined || valor === null) return null;

  const { media, desvioPadrao } = calcularEstatisticas(indicador);
  const zScore = calcularZScore(valor, media, desvioPadrao);
  const classificacao = classificarZScore(zScore, config.maiorMelhor);
  const percentil = zScoreToPercentil(config.maiorMelhor ? zScore : -zScore);

  return {
    indicador,
    label: config.label,
    valor,
    media,
    desvioPadrao,
    zScore,
    classificacao,
    percentil,
    categoria: config.categoria,
    maiorMelhor: config.maiorMelhor,
  };
}

// Calculate gap analysis for an indicator
function calcularGap(municipio: Municipio, indicador: string, similares: Municipio[]): GapAnalysis | null {
  const config = INDICADORES_CONFIG[indicador];
  if (!config) return null;

  const valorAtual = municipio[indicador as keyof Municipio] as number;
  if (valorAtual === undefined || valorAtual === null) return null;

  // Calculate target as average of top 25% similar municipalities
  const valoresSimilares = similares
    .map(m => m[indicador as keyof Municipio] as number)
    .filter(v => v !== undefined && v !== null)
    .sort((a, b) => config.maiorMelhor ? b - a : a - b);

  const top25 = valoresSimilares.slice(0, Math.max(1, Math.floor(valoresSimilares.length * 0.25)));
  const valorMeta = top25.reduce((sum, v) => sum + v, 0) / top25.length;

  const gap = valorMeta - valorAtual;
  const gapPercentual = valorAtual !== 0 ? (gap / valorAtual) * 100 : 0;

  // Determine priority based on gap size and indicator importance
  let prioridade: 'alta' | 'media' | 'baixa' = 'baixa';
  const gapAbs = Math.abs(gapPercentual);
  if (gapAbs > 30) prioridade = 'alta';
  else if (gapAbs > 15) prioridade = 'media';

  // Only include gaps where improvement is needed
  const needsImprovement = config.maiorMelhor ? gap > 0 : gap < 0;
  if (!needsImprovement) return null;

  const custoEstimado = calcularCustoIndicador(
    indicador,
    Math.abs(gap),
    municipio.populacao,
    municipio.ufSigla
  );

  return {
    indicador,
    label: config.label,
    valorAtual,
    valorMeta,
    gap: Math.abs(gap),
    gapPercentual: Math.abs(gapPercentual),
    prioridade,
    custoEstimado,
    categoria: config.categoria,
  };
}

// Generate complete municipal diagnosis
export function gerarDiagnostico(municipio: Municipio): DiagnosticoMunicipal {
  const similares = getMunicipiosSimilares(municipio, 10);
  
  const scores: DiagnosticoMunicipal['scores'] = {
    saude: [],
    educacao: [],
    infraestrutura: [],
    economico: [],
  };

  const gaps: GapAnalysis[] = [];

  // Calculate Z-Scores for all indicators
  Object.keys(INDICADORES_CONFIG).forEach(indicador => {
    const resultado = calcularZScoreIndicador(municipio, indicador);
    if (resultado) {
      scores[resultado.categoria].push(resultado);
    }

    const gapAnalise = calcularGap(municipio, indicador, similares);
    if (gapAnalise) {
      gaps.push(gapAnalise);
    }
  });

  // Sort gaps by priority and gap size
  gaps.sort((a, b) => {
    const prioridadeOrder = { alta: 0, media: 1, baixa: 2 };
    if (prioridadeOrder[a.prioridade] !== prioridadeOrder[b.prioridade]) {
      return prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade];
    }
    return b.gapPercentual - a.gapPercentual;
  });

  // Calculate average score per category
  const mediaPorCategoria = {
    saude: scores.saude.length > 0 
      ? scores.saude.reduce((sum, s) => sum + s.zScore, 0) / scores.saude.length 
      : 0,
    educacao: scores.educacao.length > 0 
      ? scores.educacao.reduce((sum, s) => sum + s.zScore, 0) / scores.educacao.length 
      : 0,
    infraestrutura: scores.infraestrutura.length > 0 
      ? scores.infraestrutura.reduce((sum, s) => sum + s.zScore, 0) / scores.infraestrutura.length 
      : 0,
    economico: scores.economico.length > 0 
      ? scores.economico.reduce((sum, s) => sum + s.zScore, 0) / scores.economico.length 
      : 0,
  };

  // Calculate overall score
  const allScores = [...scores.saude, ...scores.educacao, ...scores.infraestrutura, ...scores.economico];
  const scoreGeral = allScores.length > 0 
    ? allScores.reduce((sum, s) => sum + s.zScore, 0) / allScores.length 
    : 0;

  // Calculate ranking within state
  const municipiosEstado = MUNICIPIOS_POR_UF[municipio.ufSigla] || [];
  const rankingEstado = municipiosEstado
    .sort((a, b) => b.idhm - a.idhm)
    .findIndex(m => m.codigoIbge === municipio.codigoIbge) + 1;

  return {
    municipio,
    dataAnalise: new Date().toISOString(),
    scores,
    mediaPorCategoria,
    scoreGeral,
    rankingEstado,
    totalMunicipiosEstado: municipiosEstado.length,
    similares,
    gaps,
  };
}

// Get classification color
export function getClassificacaoColor(classificacao: ClassificacaoZScore): string {
  const colors: Record<ClassificacaoZScore, string> = {
    critico: '#EF4444',
    abaixo: '#F97316',
    na_media: '#EAB308',
    acima: '#22C55E',
    excelente: '#10B981',
  };
  return colors[classificacao];
}

// Get classification label
export function getClassificacaoLabel(classificacao: ClassificacaoZScore): string {
  const labels: Record<ClassificacaoZScore, string> = {
    critico: 'Crítico',
    abaixo: 'Abaixo da Média',
    na_media: 'Na Média',
    acima: 'Acima da Média',
    excelente: 'Excelente',
  };
  return labels[classificacao];
}
