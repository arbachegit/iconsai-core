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
