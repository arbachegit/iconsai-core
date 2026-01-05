/**
 * Types for Gov City AI - City Comparison Feature
 */

export interface MunicipioComparacao {
  id: number;
  codigoIbge: number;
  nome: string;
  ufSigla: string;
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

export interface CidadeModelo {
  cidade: MunicipioComparacao;
  similaridadePopulacao: number;
  diferencaIdhm: number;
  rankingNacional: number;
}

export interface GapIndicador {
  indicador: string;
  label: string;
  valorOrigem: number;
  valorDestino: number;
  gap: number;
  gapPercentual: number;
  categoria: 'saude' | 'educacao' | 'infraestrutura' | 'economico';
  custoEstimado: number;
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface PlanoInvestimento {
  cidadeOrigem: MunicipioComparacao;
  cidadeModelo: CidadeModelo;
  gaps: GapIndicador[];
  custoTotal: number;
  prazoMeses: number;
  impactoIdhmEsperado: number;
  cenarios: {
    otimista: number;
    base: number;
    pessimista: number;
  };
}

export interface RegiaoEstado {
  nome: string;
  codigo: string;
  municipios: number[];
}

export interface FiltrosCidadeModelo {
  populacaoMinima: number;
  populacaoMaxima: number;
  idhmMinimo: number;
  apenasCapitais: boolean;
  mesmaRegiao: boolean;
}
