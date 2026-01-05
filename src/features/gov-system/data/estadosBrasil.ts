export const CORES_ESTADOS: Record<string, string> = {
  AC: '#2E7D32', AL: '#1565C0', AP: '#388E3C', AM: '#43A047', BA: '#F57C00',
  CE: '#0277BD', DF: '#7B1FA2', ES: '#00838F', GO: '#FBC02D', MA: '#0288D1',
  MT: '#F9A825', MS: '#FFB300', MG: '#C62828', PA: '#558B2F', PB: '#1976D2',
  PR: '#D32F2F', PE: '#303F9F', PI: '#0097A7', RJ: '#8E24AA', RN: '#00ACC1',
  RS: '#00695C', RO: '#689F38', RR: '#4CAF50', SC: '#00897B', SP: '#B71C1C',
  SE: '#5C6BC0', TO: '#7CB342'
};

export const DADOS_ESTADOS: Record<string, { 
  nome: string; 
  regiao: string;
  populacao: number; 
  pib: number; 
  idhm: number;
  capital: string;
}> = {
  AC: { nome: 'Acre', regiao: 'Norte', populacao: 906876, pib: 17633, idhm: 0.663, capital: 'Rio Branco' },
  AL: { nome: 'Alagoas', regiao: 'Nordeste', populacao: 3365351, pib: 58963, idhm: 0.631, capital: 'Maceió' },
  AP: { nome: 'Amapá', regiao: 'Norte', populacao: 877613, pib: 18952, idhm: 0.708, capital: 'Macapá' },
  AM: { nome: 'Amazonas', regiao: 'Norte', populacao: 4269995, pib: 116682, idhm: 0.674, capital: 'Manaus' },
  BA: { nome: 'Bahia', regiao: 'Nordeste', populacao: 14985284, pib: 305321, idhm: 0.660, capital: 'Salvador' },
  CE: { nome: 'Ceará', regiao: 'Nordeste', populacao: 9240580, pib: 166915, idhm: 0.682, capital: 'Fortaleza' },
  DF: { nome: 'Distrito Federal', regiao: 'Centro-Oeste', populacao: 3094325, pib: 265848, idhm: 0.824, capital: 'Brasília' },
  ES: { nome: 'Espírito Santo', regiao: 'Sudeste', populacao: 4108508, pib: 144759, idhm: 0.740, capital: 'Vitória' },
  GO: { nome: 'Goiás', regiao: 'Centro-Oeste', populacao: 7206589, pib: 224127, idhm: 0.735, capital: 'Goiânia' },
  MA: { nome: 'Maranhão', regiao: 'Nordeste', populacao: 7153262, pib: 106918, idhm: 0.639, capital: 'São Luís' },
  MT: { nome: 'Mato Grosso', regiao: 'Centro-Oeste', populacao: 3567234, pib: 186766, idhm: 0.725, capital: 'Cuiabá' },
  MS: { nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', populacao: 2839188, pib: 115079, idhm: 0.729, capital: 'Campo Grande' },
  MG: { nome: 'Minas Gerais', regiao: 'Sudeste', populacao: 21411923, pib: 682786, idhm: 0.731, capital: 'Belo Horizonte' },
  PA: { nome: 'Pará', regiao: 'Norte', populacao: 8777124, pib: 178377, idhm: 0.646, capital: 'Belém' },
  PB: { nome: 'Paraíba', regiao: 'Nordeste', populacao: 4059905, pib: 67805, idhm: 0.658, capital: 'João Pessoa' },
  PR: { nome: 'Paraná', regiao: 'Sul', populacao: 11597484, pib: 466377, idhm: 0.749, capital: 'Curitiba' },
  PE: { nome: 'Pernambuco', regiao: 'Nordeste', populacao: 9674793, pib: 197853, idhm: 0.673, capital: 'Recife' },
  PI: { nome: 'Piauí', regiao: 'Nordeste', populacao: 3289290, pib: 56390, idhm: 0.646, capital: 'Teresina' },
  RJ: { nome: 'Rio de Janeiro', regiao: 'Sudeste', populacao: 17463349, pib: 753824, idhm: 0.761, capital: 'Rio de Janeiro' },
  RN: { nome: 'Rio Grande do Norte', regiao: 'Nordeste', populacao: 3560903, pib: 71336, idhm: 0.684, capital: 'Natal' },
  RS: { nome: 'Rio Grande do Sul', regiao: 'Sul', populacao: 11466630, pib: 470942, idhm: 0.746, capital: 'Porto Alegre' },
  RO: { nome: 'Rondônia', regiao: 'Norte', populacao: 1815278, pib: 52965, idhm: 0.690, capital: 'Porto Velho' },
  RR: { nome: 'Roraima', regiao: 'Norte', populacao: 652713, pib: 16622, idhm: 0.707, capital: 'Boa Vista' },
  SC: { nome: 'Santa Catarina', regiao: 'Sul', populacao: 7338473, pib: 349275, idhm: 0.774, capital: 'Florianópolis' },
  SP: { nome: 'São Paulo', regiao: 'Sudeste', populacao: 46289333, pib: 2348337, idhm: 0.783, capital: 'São Paulo' },
  SE: { nome: 'Sergipe', regiao: 'Nordeste', populacao: 2338474, pib: 44732, idhm: 0.665, capital: 'Aracaju' },
  TO: { nome: 'Tocantins', regiao: 'Norte', populacao: 1607363, pib: 43514, idhm: 0.699, capital: 'Palmas' }
};

export const getCorRegiao = (regiao: string): string => {
  const cores: Record<string, string> = {
    'Norte': '#4CAF50',
    'Nordeste': '#2196F3',
    'Centro-Oeste': '#FFC107',
    'Sudeste': '#9C27B0',
    'Sul': '#009688'
  };
  return cores[regiao] || '#757575';
};
