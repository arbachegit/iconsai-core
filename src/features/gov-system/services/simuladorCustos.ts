import type { 
  Municipio, 
  MetaInvestimento, 
  SimulacaoOutput, 
  CustoDetalhe, 
  FaseProjeto, 
  ImpactoProjetado 
} from '../types';
import { 
  CUSTOS_POR_INDICADOR, 
  getFatorPopulacao, 
  getFatorRegional, 
  getTempoImplementacao,
  CATEGORIAS 
} from '../data/custosInvestimento';

// Calculate cost for a single indicator
function calcularCustoDetalhe(
  indicador: string,
  variacao: number,
  populacao: number,
  ufSigla: string
): CustoDetalhe | null {
  const config = CUSTOS_POR_INDICADOR[indicador];
  if (!config || variacao === 0) return null;

  const fatorPopulacao = getFatorPopulacao(populacao);
  const fatorRegional = getFatorRegional(ufSigla);
  
  // Special handling for different indicator units
  let multiplicador = 1;
  if (indicador === 'leitosPor1000' || indicador === 'medicosPor1000') {
    multiplicador = 10; // Cost is per 0.1, so multiply by 10 for per 1.0
  } else if (indicador === 'ideb') {
    multiplicador = 2; // Cost is per 0.5, so multiply by 2 for per 1.0
  } else if (indicador === 'rendaMedia') {
    multiplicador = variacao / 100; // Cost is per R$100
  } else if (indicador === 'pibPerCapita') {
    multiplicador = variacao / 1000; // Cost is per R$1000
  } else {
    multiplicador = variacao;
  }

  const custoFinal = config.custoBase * fatorPopulacao * fatorRegional * Math.abs(multiplicador) / config.elasticidade;

  return {
    indicador,
    label: config.label,
    custoBase: config.custoBase,
    fatorPopulacao,
    fatorRegional,
    custoFinal,
    tempo: config.tempoImplementacao,
  };
}

// Generate project timeline with phases
function gerarCronograma(custos: CustoDetalhe[]): FaseProjeto[] {
  if (custos.length === 0) return [];

  // Group by category
  const porCategoria: Record<string, CustoDetalhe[]> = {
    saude: [],
    educacao: [],
    infraestrutura: [],
    economico: [],
  };

  custos.forEach(c => {
    const config = CUSTOS_POR_INDICADOR[c.indicador];
    if (config) {
      porCategoria[config.categoria].push(c);
    }
  });

  const fases: FaseProjeto[] = [];
  let mesAtual = 0;

  Object.entries(porCategoria).forEach(([categoria, items], index) => {
    if (items.length === 0) return;

    const tempoMaximo = Math.max(...items.map(i => i.tempo));
    const custoFase = items.reduce((sum, i) => sum + i.custoFinal, 0);

    fases.push({
      fase: index + 1,
      nome: CATEGORIAS[categoria as keyof typeof CATEGORIAS]?.label || categoria,
      indicadores: items.map(i => i.indicador),
      inicio: mesAtual,
      fim: mesAtual + tempoMaximo,
      custoFase,
    });

    // Overlap phases by 30% for efficiency
    mesAtual += Math.ceil(tempoMaximo * 0.7);
  });

  return fases;
}

// Estimate impact on key metrics
function estimarImpacto(
  municipio: Municipio,
  metas: MetaInvestimento[]
): ImpactoProjetado {
  // Calculate IDHM improvement based on component changes
  let variacaoIdhm = 0;

  metas.forEach(meta => {
    // IDHM components weights (approximate)
    const pesos: Record<string, number> = {
      esperancaVida: 0.33 * 0.01, // 1 year ≈ 0.01 IDHM
      txAlfabetizacao: 0.33 * 0.003, // 1% ≈ 0.003 IDHM
      rendaMedia: 0.33 * 0.0001, // R$100 ≈ 0.0001 IDHM
    };

    const peso = pesos[meta.indicador] || 0.001;
    variacaoIdhm += meta.variacao * peso;
  });

  // Cap IDHM change at reasonable levels
  variacaoIdhm = Math.min(variacaoIdhm, 0.05);

  // Estimate jobs created based on investment
  const investimentoTotal = metas.reduce((sum, m) => {
    const custo = calcularCustoDetalhe(
      m.indicador,
      m.variacao,
      municipio.populacao,
      municipio.ufSigla
    );
    return sum + (custo?.custoFinal || 0);
  }, 0);

  // Rule of thumb: 1 job per R$150,000 invested
  const empregos = Math.round(investimentoTotal / 150000);

  // Estimate benefited population based on indicators
  const hasInfrastructure = metas.some(m => 
    ['aguaEncanada', 'esgotoAdequado', 'coletaLixo'].includes(m.indicador)
  );
  const hasHealth = metas.some(m => 
    ['leitosPor1000', 'medicosPor1000', 'mortInfantil'].includes(m.indicador)
  );

  let populacaoBeneficiada = municipio.populacao * 0.3; // Base 30%
  if (hasInfrastructure) populacaoBeneficiada = Math.max(populacaoBeneficiada, municipio.populacao * 0.5);
  if (hasHealth) populacaoBeneficiada = Math.max(populacaoBeneficiada, municipio.populacao * 0.7);

  return {
    idhmProjetado: Math.min(municipio.idhm + variacaoIdhm, 1),
    variacaoIdhm,
    populacaoBeneficiada: Math.round(populacaoBeneficiada),
    empregos,
  };
}

// Main simulation function
export function simularInvestimento(
  municipio: Municipio,
  metas: MetaInvestimento[]
): SimulacaoOutput {
  // Calculate costs for each indicator
  const custoPorIndicador: CustoDetalhe[] = [];

  metas.forEach(meta => {
    if (meta.variacao === 0) return;

    const custo = calcularCustoDetalhe(
      meta.indicador,
      meta.variacao,
      municipio.populacao,
      municipio.ufSigla
    );

    if (custo) {
      custoPorIndicador.push(custo);
    }
  });

  // Calculate total cost
  const custoBase = custoPorIndicador.reduce((sum, c) => sum + c.custoFinal, 0);

  // Generate timeline
  const cronograma = gerarCronograma(custoPorIndicador);
  const prazoTotal = cronograma.length > 0 
    ? Math.max(...cronograma.map(f => f.fim)) 
    : 0;

  // Estimate impact
  const impactoEsperado = estimarImpacto(municipio, metas);

  // Calculate scenarios
  const cenarios = {
    otimista: custoBase * 0.85, // 15% less due to efficiency
    base: custoBase,
    pessimista: custoBase * 1.25, // 25% more due to contingencies
  };

  return {
    municipio,
    metas,
    custoTotal: custoBase,
    custoPorIndicador,
    cronograma,
    impactoEsperado,
    cenarios,
    prazoTotal,
  };
}

// Format currency
export function formatarMoeda(valor: number): string {
  if (valor >= 1e9) {
    return `R$ ${(valor / 1e9).toFixed(2)} bi`;
  }
  if (valor >= 1e6) {
    return `R$ ${(valor / 1e6).toFixed(2)} mi`;
  }
  if (valor >= 1e3) {
    return `R$ ${(valor / 1e3).toFixed(1)} mil`;
  }
  return `R$ ${valor.toFixed(0)}`;
}

// Get available indicators for simulation
export function getIndicadoresDisponiveis(municipio: Municipio): Array<{
  codigo: string;
  label: string;
  valorAtual: number;
  unidade: string;
  categoria: string;
}> {
  return Object.entries(CUSTOS_POR_INDICADOR).map(([codigo, config]) => {
    const valorAtual = municipio[codigo as keyof Municipio] as number | undefined;
    return {
      codigo,
      label: config.label,
      valorAtual: valorAtual ?? 0,
      unidade: config.unidade,
      categoria: config.categoria,
    };
  }).filter(i => i.valorAtual !== undefined && i.valorAtual !== null);
}
