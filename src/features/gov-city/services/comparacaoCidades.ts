import type { MunicipioComparacao, CidadeModelo, GapIndicador, PlanoInvestimento, FiltrosCidadeModelo } from '../types';
import { CUSTOS_POR_INDICADOR, getFatorPopulacao, getFatorRegional } from '../../gov-system/data/custosInvestimento';

/**
 * Find similar cities with higher IDHM
 */
export function buscarCidadesModelo(
  cidadeOrigem: MunicipioComparacao,
  todasCidades: MunicipioComparacao[],
  filtros: FiltrosCidadeModelo
): CidadeModelo[] {
  const populacaoMin = cidadeOrigem.populacao * (filtros.populacaoMinima / 100);
  const populacaoMax = cidadeOrigem.populacao * (filtros.populacaoMaxima / 100);

  return todasCidades
    .filter(c => {
      if (c.codigoIbge === cidadeOrigem.codigoIbge) return false;
      if (c.idhm <= cidadeOrigem.idhm) return false;
      if (c.idhm < filtros.idhmMinimo) return false;
      if (c.populacao < populacaoMin || c.populacao > populacaoMax) return false;
      return true;
    })
    .map(cidade => {
      const diferencaPopulacao = Math.abs(cidade.populacao - cidadeOrigem.populacao) / cidadeOrigem.populacao;
      const similaridadePopulacao = Math.max(0, 100 - diferencaPopulacao * 100);

      return {
        cidade,
        similaridadePopulacao,
        diferencaIdhm: cidade.idhm - cidadeOrigem.idhm,
        rankingNacional: 0,
      };
    })
    .sort((a, b) => {
      const scoreA = a.diferencaIdhm * 0.6 + (100 - a.similaridadePopulacao) * 0.004;
      const scoreB = b.diferencaIdhm * 0.6 + (100 - b.similaridadePopulacao) * 0.004;
      return scoreA - scoreB;
    })
    .slice(0, 10);
}

/**
 * Calculate gaps between two cities
 */
export function calcularGaps(
  origem: MunicipioComparacao,
  destino: MunicipioComparacao
): GapIndicador[] {
  const indicadores = [
    { codigo: 'esperancaVida', label: 'Esperança de Vida', categoria: 'saude' as const, maiorMelhor: true },
    { codigo: 'mortInfantil', label: 'Mortalidade Infantil', categoria: 'saude' as const, maiorMelhor: false },
    { codigo: 'leitosPor1000', label: 'Leitos/1000 hab', categoria: 'saude' as const, maiorMelhor: true },
    { codigo: 'medicosPor1000', label: 'Médicos/1000 hab', categoria: 'saude' as const, maiorMelhor: true },
    { codigo: 'ideb', label: 'IDEB', categoria: 'educacao' as const, maiorMelhor: true },
    { codigo: 'txAlfabetizacao', label: 'Taxa de Alfabetização', categoria: 'educacao' as const, maiorMelhor: true },
    { codigo: 'aguaEncanada', label: 'Água Encanada %', categoria: 'infraestrutura' as const, maiorMelhor: true },
    { codigo: 'esgotoAdequado', label: 'Esgoto Adequado %', categoria: 'infraestrutura' as const, maiorMelhor: true },
    { codigo: 'coletaLixo', label: 'Coleta de Lixo %', categoria: 'infraestrutura' as const, maiorMelhor: true },
    { codigo: 'rendaMedia', label: 'Renda Média', categoria: 'economico' as const, maiorMelhor: true },
    { codigo: 'pibPerCapita', label: 'PIB per Capita', categoria: 'economico' as const, maiorMelhor: true },
  ];

  const gaps: GapIndicador[] = [];

  indicadores.forEach(ind => {
    const origemRecord = origem as unknown as Record<string, number | undefined>;
    const destinoRecord = destino as unknown as Record<string, number | undefined>;
    const valorOrigem = origemRecord[ind.codigo];
    const valorDestino = destinoRecord[ind.codigo];

    if (valorOrigem === undefined || valorDestino === undefined) return;
    if (valorOrigem === null || valorDestino === null) return;

    let gap = valorDestino - valorOrigem;
    if (!ind.maiorMelhor) gap = -gap;

    if (gap <= 0) return;

    const gapPercentual = valorOrigem > 0 ? (gap / valorOrigem) * 100 : 100;
    const custoEstimado = calcularCustoIndicador(ind.codigo, gap, origem.populacao, origem.ufSigla);

    let prioridade: 'alta' | 'media' | 'baixa' = 'baixa';
    if (gapPercentual > 30 || ind.codigo === 'mortInfantil') prioridade = 'alta';
    else if (gapPercentual > 15) prioridade = 'media';

    gaps.push({
      indicador: ind.codigo,
      label: ind.label,
      valorOrigem,
      valorDestino,
      gap: Math.abs(gap),
      gapPercentual,
      categoria: ind.categoria,
      custoEstimado,
      prioridade,
    });
  });

  return gaps.sort((a, b) => {
    const prioridadeOrdem = { alta: 0, media: 1, baixa: 2 };
    return prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade];
  });
}

/**
 * Calculate cost for an indicator improvement
 */
function calcularCustoIndicador(
  indicador: string,
  variacao: number,
  populacao: number,
  ufSigla: string
): number {
  const config = CUSTOS_POR_INDICADOR[indicador];
  if (!config) return 0;

  const fatorPopulacao = getFatorPopulacao(populacao);
  const fatorRegional = getFatorRegional(ufSigla);

  let multiplicador = 1;
  if (indicador === 'leitosPor1000' || indicador === 'medicosPor1000') {
    multiplicador = 10;
  } else if (indicador === 'ideb') {
    multiplicador = 2;
  } else if (indicador === 'rendaMedia') {
    multiplicador = variacao / 100;
  } else if (indicador === 'pibPerCapita') {
    multiplicador = variacao / 1000;
  } else {
    multiplicador = variacao;
  }

  return config.custoBase * fatorPopulacao * fatorRegional * Math.abs(multiplicador) / config.elasticidade;
}

/**
 * Generate full investment plan
 */
export function gerarPlanoInvestimento(
  origem: MunicipioComparacao,
  modelo: CidadeModelo
): PlanoInvestimento {
  const gaps = calcularGaps(origem, modelo.cidade);
  const custoTotal = gaps.reduce((sum, g) => sum + g.custoEstimado, 0);

  const gapsAlta = gaps.filter(g => g.prioridade === 'alta').length;
  const gapsMedia = gaps.filter(g => g.prioridade === 'media').length;
  const prazoMeses = 12 + gapsAlta * 6 + gapsMedia * 3;

  const impactoIdhmEsperado = modelo.diferencaIdhm * 0.7;

  return {
    cidadeOrigem: origem,
    cidadeModelo: modelo,
    gaps,
    custoTotal,
    prazoMeses: Math.min(prazoMeses, 60),
    impactoIdhmEsperado,
    cenarios: {
      otimista: custoTotal * 0.85,
      base: custoTotal,
      pessimista: custoTotal * 1.25,
    },
  };
}

/**
 * Format currency helper
 */
export function formatarMoeda(valor: number): string {
  if (valor >= 1e9) return `R$ ${(valor / 1e9).toFixed(2)} bi`;
  if (valor >= 1e6) return `R$ ${(valor / 1e6).toFixed(2)} mi`;
  if (valor >= 1e3) return `R$ ${(valor / 1e3).toFixed(1)} mil`;
  return `R$ ${valor.toFixed(0)}`;
}
