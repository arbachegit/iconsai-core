/**
 * Types for Gov System Fontes
 */

export type NivelGeografico = 'brasil' | 'estado' | 'regiao' | 'cidade';

export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

export interface BreadcrumbItem {
  nivel: NivelGeografico;
  id: string | number;
  nome: string;
  sigla?: string;
}

export interface IndicadoresEstado {
  populacao: number;
  pibTotal: number;
  pibPerCapita?: number;
  idhm: number;
  idhmEducacao?: number;
  idhmLongevidade?: number;
  idhmRenda?: number;
  esperancaVida?: number;
  mortInfantil?: number;
  txAlfabetizacao?: number;
}

export interface Estado {
  id: string;
  sigla: string;
  nome: string;
  regiao?: Regiao;
  indicadores: IndicadoresEstado;
}

export interface Municipio {
  id: number;
  codigoIbge: number;
  nome: string;
  ufSigla: string;
  ufId: number;
  populacao: number;
  idhm: number;
  pibPerCapita: number;
  rendaMedia: number;
  esperancaVida?: number;
  mortInfantil?: number;
  leitosPor1000?: number;
  medicosPor1000?: number;
  ideb?: number;
  txAlfabetizacao?: number;
  aguaEncanada?: number;
  esgotoAdequado?: number;
  coletaLixo?: number;
}

export interface NavigationState {
  nivelAtual: NivelGeografico;
  breadcrumb: BreadcrumbItem[];
  estadoSelecionado: Estado | null;
  cidadeSelecionada: Municipio | null;
  estadosParaComparar: string[];
  modoComparacao: boolean;
}

export interface ComparacaoItem {
  indicador: string;
  label: string;
  valorA: number | null;
  valorB: number | null;
  unidade: string;
  maiorMelhor: boolean;
  delta: number;
  deltaPct: number;
  vencedor: 'A' | 'B' | 'empate' | null;
}

// Z-Score and Diagnosis Types
export type ClassificacaoZScore = 'critico' | 'abaixo' | 'na_media' | 'acima' | 'excelente';

export interface ZScoreResult {
  indicador: string;
  label: string;
  valor: number;
  media: number;
  desvioPadrao: number;
  zScore: number;
  classificacao: ClassificacaoZScore;
  percentil: number;
  categoria: 'saude' | 'educacao' | 'infraestrutura' | 'economico';
  maiorMelhor: boolean;
}

export interface GapAnalysis {
  indicador: string;
  label: string;
  valorAtual: number;
  valorMeta: number;
  gap: number;
  gapPercentual: number;
  prioridade: 'alta' | 'media' | 'baixa';
  custoEstimado: number;
  categoria: 'saude' | 'educacao' | 'infraestrutura' | 'economico';
}

export interface DiagnosticoMunicipal {
  municipio: Municipio;
  dataAnalise: string;
  scores: {
    saude: ZScoreResult[];
    educacao: ZScoreResult[];
    infraestrutura: ZScoreResult[];
    economico: ZScoreResult[];
  };
  mediaPorCategoria: {
    saude: number;
    educacao: number;
    infraestrutura: number;
    economico: number;
  };
  scoreGeral: number;
  rankingEstado: number;
  totalMunicipiosEstado: number;
  similares: Municipio[];
  gaps: GapAnalysis[];
}

// Investment Simulator Types
export interface CustoIndicador {
  codigo: string;
  label: string;
  categoria: 'saude' | 'educacao' | 'infraestrutura' | 'economico';
  unidade: string;
  custoBase: number;
  tempoImplementacao: number; // months
  elasticidade: number;
  descricao: string;
}

export interface MetaInvestimento {
  indicador: string;
  valorAtual: number;
  valorMeta: number;
  variacao: number;
}

export interface CustoDetalhe {
  indicador: string;
  label: string;
  custoBase: number;
  fatorPopulacao: number;
  fatorRegional: number;
  custoFinal: number;
  tempo: number;
}

export interface FaseProjeto {
  fase: number;
  nome: string;
  indicadores: string[];
  inicio: number; // month
  fim: number; // month
  custoFase: number;
}

export interface ImpactoProjetado {
  idhmProjetado: number;
  variacaoIdhm: number;
  populacaoBeneficiada: number;
  empregos: number;
}

export interface SimulacaoOutput {
  municipio: Municipio;
  metas: MetaInvestimento[];
  custoTotal: number;
  custoPorIndicador: CustoDetalhe[];
  cronograma: FaseProjeto[];
  impactoEsperado: ImpactoProjetado;
  cenarios: {
    otimista: number;
    base: number;
    pessimista: number;
  };
  prazoTotal: number;
}

// Filter Types
export interface FiltrosMunicipio {
  nome: string;
  populacaoMin: number | null;
  populacaoMax: number | null;
  idhmMin: number | null;
  idhmMax: number | null;
  ordenarPor: 'nome' | 'populacao' | 'idhm' | 'pibPerCapita';
  ordemAsc: boolean;
}
