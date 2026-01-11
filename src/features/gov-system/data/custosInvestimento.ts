import type { CustoIndicador } from '../types';

// Investment costs per indicator - based on historical data from SIOPS, FINBRA, PAC
export const CUSTOS_POR_INDICADOR: Record<string, CustoIndicador> = {
  // Health indicators
  mortInfantil: {
    codigo: 'mortInfantil',
    label: 'Mortalidade Infantil',
    categoria: 'saude',
    unidade: 'por 1 ponto de redução',
    custoBase: 850000, // R$ per point reduction
    tempoImplementacao: 24, // months
    elasticidade: 0.85,
    descricao: 'Investimento em UTI neonatal, pré-natal e capacitação de equipes'
  },
  leitosPor1000: {
    codigo: 'leitosPor1000',
    label: 'Leitos por 1.000 hab',
    categoria: 'saude',
    unidade: 'por 0.1 leito adicional',
    custoBase: 1800000, // R$ per 0.1 beds/1000
    tempoImplementacao: 18,
    elasticidade: 0.92,
    descricao: 'Construção e equipamento de leitos hospitalares'
  },
  medicosPor1000: {
    codigo: 'medicosPor1000',
    label: 'Médicos por 1.000 hab',
    categoria: 'saude',
    unidade: 'por 0.1 médico adicional',
    custoBase: 1200000, // R$ per 0.1 doctors/1000 (incentives, infrastructure)
    tempoImplementacao: 12,
    elasticidade: 0.78,
    descricao: 'Programa de incentivo, residências e UBS'
  },
  esperancaVida: {
    codigo: 'esperancaVida',
    label: 'Esperança de Vida',
    categoria: 'saude',
    unidade: 'por 1 ano adicional',
    custoBase: 5500000, // R$ per year of life expectancy
    tempoImplementacao: 48,
    elasticidade: 0.65,
    descricao: 'Investimento multissetorial em saúde preventiva'
  },

  // Education indicators
  ideb: {
    codigo: 'ideb',
    label: 'IDEB',
    categoria: 'educacao',
    unidade: 'por 0.5 ponto',
    custoBase: 2200000, // R$ per 0.5 IDEB points
    tempoImplementacao: 24,
    elasticidade: 0.75,
    descricao: 'Formação de professores, material didático e infraestrutura escolar'
  },
  txAlfabetizacao: {
    codigo: 'txAlfabetizacao',
    label: 'Taxa de Alfabetização',
    categoria: 'educacao',
    unidade: 'por 1% de aumento',
    custoBase: 450000, // R$ per 1% increase
    tempoImplementacao: 36,
    elasticidade: 0.82,
    descricao: 'Programas de alfabetização de jovens e adultos'
  },

  // Infrastructure indicators
  aguaEncanada: {
    codigo: 'aguaEncanada',
    label: 'Água Encanada',
    categoria: 'infraestrutura',
    unidade: 'por 1% de cobertura',
    custoBase: 2500000, // R$ per 1% coverage
    tempoImplementacao: 36,
    elasticidade: 0.78,
    descricao: 'Extensão de rede de distribuição e tratamento'
  },
  esgotoAdequado: {
    codigo: 'esgotoAdequado',
    label: 'Esgoto Adequado',
    categoria: 'infraestrutura',
    unidade: 'por 1% de cobertura',
    custoBase: 3200000, // R$ per 1% coverage
    tempoImplementacao: 48,
    elasticidade: 0.72,
    descricao: 'Rede de coleta e estação de tratamento'
  },
  coletaLixo: {
    codigo: 'coletaLixo',
    label: 'Coleta de Lixo',
    categoria: 'infraestrutura',
    unidade: 'por 1% de cobertura',
    custoBase: 850000, // R$ per 1% coverage
    tempoImplementacao: 12,
    elasticidade: 0.88,
    descricao: 'Frota de coleta e aterro sanitário'
  },

  // Economic indicators
  rendaMedia: {
    codigo: 'rendaMedia',
    label: 'Renda Média',
    categoria: 'economico',
    unidade: 'por R$ 100 de aumento',
    custoBase: 1500000, // R$ per R$100 increase in average income
    tempoImplementacao: 36,
    elasticidade: 0.55,
    descricao: 'Programas de qualificação profissional e incentivo ao emprego'
  },
  pibPerCapita: {
    codigo: 'pibPerCapita',
    label: 'PIB per Capita',
    categoria: 'economico',
    unidade: 'por R$ 1.000 de aumento',
    custoBase: 8500000, // R$ per R$1000 increase in GDP per capita
    tempoImplementacao: 48,
    elasticidade: 0.45,
    descricao: 'Incentivos fiscais, infraestrutura produtiva e capacitação'
  },
};

// Regional adjustment factors
export const FATORES_REGIONAIS: Record<string, number> = {
  'Norte': 1.25,
  'Nordeste': 1.20,
  'Centro-Oeste': 1.15,
  'Sudeste': 1.00,
  'Sul': 1.05,
};

// Get regional factor by state
export function getFatorRegional(ufSigla: string): number {
  const regioes: Record<string, string> = {
    AC: 'Norte', AL: 'Nordeste', AP: 'Norte', AM: 'Norte', BA: 'Nordeste',
    CE: 'Nordeste', DF: 'Centro-Oeste', ES: 'Sudeste', GO: 'Centro-Oeste',
    MA: 'Nordeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste', MG: 'Sudeste',
    PA: 'Norte', PB: 'Nordeste', PR: 'Sul', PE: 'Nordeste', PI: 'Nordeste',
    RJ: 'Sudeste', RN: 'Nordeste', RS: 'Sul', RO: 'Norte', RR: 'Norte',
    SC: 'Sul', SP: 'Sudeste', SE: 'Nordeste', TO: 'Norte'
  };
  const regiao = regioes[ufSigla] || 'Sudeste';
  return FATORES_REGIONAIS[regiao] || 1.0;
}

// Calculate population adjustment factor
export function getFatorPopulacao(populacao: number): number {
  // Formula: (population / 50000) ^ 0.7
  // Larger cities have economies of scale but also more complexity
  return Math.pow(populacao / 50000, 0.7);
}

// Get cost for a specific indicator improvement
export function calcularCustoIndicador(
  indicador: string,
  gap: number,
  populacao: number,
  ufSigla: string
): number {
  const custo = CUSTOS_POR_INDICADOR[indicador];
  if (!custo) return 0;

  const fatorPopulacao = getFatorPopulacao(populacao);
  const fatorRegional = getFatorRegional(ufSigla);
  
  // Cost = BaseCoost × PopulationFactor × RegionalFactor × (Gap / Elasticity)
  return custo.custoBase * fatorPopulacao * fatorRegional * (Math.abs(gap) / custo.elasticidade);
}

// Get implementation time for an indicator
export function getTempoImplementacao(indicador: string): number {
  return CUSTOS_POR_INDICADOR[indicador]?.tempoImplementacao || 24;
}

// Categories for grouping indicators
export const CATEGORIAS = {
  saude: { label: 'Saúde', color: '#EF4444', icon: 'Heart' },
  educacao: { label: 'Educação', color: '#3B82F6', icon: 'GraduationCap' },
  infraestrutura: { label: 'Infraestrutura', color: '#F59E0B', icon: 'Building' },
  economico: { label: 'Econômico', color: '#10B981', icon: 'TrendingUp' },
} as const;
