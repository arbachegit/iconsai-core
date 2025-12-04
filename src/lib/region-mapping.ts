export type BrazilRegion = 
  | "sudeste_sp"      // São Paulo - conciso, eficiente
  | "sudeste_mg"      // Minas Gerais - suave, "nós"
  | "sul"             // PR, SC, RS - formal, estruturado
  | "nordeste_norte"  // Nordeste/Norte - caloroso, narrativo
  | "rio"             // Rio de Janeiro - informal controlado
  | "default";        // Padrão neutro

// Mapeamento de cidades/estados para regiões culturais
const cityRegionMap: Record<string, BrazilRegion> = {
  // São Paulo
  "são paulo": "sudeste_sp",
  "sao paulo": "sudeste_sp",
  "campinas": "sudeste_sp",
  "santos": "sudeste_sp",
  "guarulhos": "sudeste_sp",
  "santo andré": "sudeste_sp",
  "osasco": "sudeste_sp",
  "ribeirão preto": "sudeste_sp",
  "sorocaba": "sudeste_sp",
  "são bernardo do campo": "sudeste_sp",
  "são josé dos campos": "sudeste_sp",
  
  // Minas Gerais
  "belo horizonte": "sudeste_mg",
  "uberlândia": "sudeste_mg",
  "juiz de fora": "sudeste_mg",
  "contagem": "sudeste_mg",
  "betim": "sudeste_mg",
  "montes claros": "sudeste_mg",
  "uberaba": "sudeste_mg",
  "governador valadares": "sudeste_mg",
  "ipatinga": "sudeste_mg",
  
  // Sul
  "curitiba": "sul",
  "porto alegre": "sul",
  "florianópolis": "sul",
  "joinville": "sul",
  "londrina": "sul",
  "caxias do sul": "sul",
  "maringá": "sul",
  "blumenau": "sul",
  "ponta grossa": "sul",
  "pelotas": "sul",
  "canoas": "sul",
  "santa maria": "sul",
  "cascavel": "sul",
  "foz do iguaçu": "sul",
  
  // Rio de Janeiro
  "rio de janeiro": "rio",
  "niterói": "rio",
  "são gonçalo": "rio",
  "duque de caxias": "rio",
  "nova iguaçu": "rio",
  "belford roxo": "rio",
  "petrópolis": "rio",
  "volta redonda": "rio",
  "campos dos goytacazes": "rio",
  
  // Nordeste
  "salvador": "nordeste_norte",
  "fortaleza": "nordeste_norte",
  "recife": "nordeste_norte",
  "natal": "nordeste_norte",
  "joão pessoa": "nordeste_norte",
  "maceió": "nordeste_norte",
  "teresina": "nordeste_norte",
  "são luís": "nordeste_norte",
  "aracaju": "nordeste_norte",
  "feira de santana": "nordeste_norte",
  "campina grande": "nordeste_norte",
  "caruaru": "nordeste_norte",
  "olinda": "nordeste_norte",
  "jaboatão dos guararapes": "nordeste_norte",
  "petrolina": "nordeste_norte",
  "mossoró": "nordeste_norte",
  
  // Norte
  "manaus": "nordeste_norte",
  "belém": "nordeste_norte",
  "porto velho": "nordeste_norte",
  "boa vista": "nordeste_norte",
  "rio branco": "nordeste_norte",
  "macapá": "nordeste_norte",
  "palmas": "nordeste_norte",
  "santarém": "nordeste_norte",
  "ananindeua": "nordeste_norte",
};

export function mapCityToRegion(city: string | null): BrazilRegion {
  if (!city) return "default";
  
  const normalized = city.toLowerCase().trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos para matching
  
  // Tenta match direto
  for (const [cityName, region] of Object.entries(cityRegionMap)) {
    const normalizedCity = cityName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized === normalizedCity || normalized.includes(normalizedCity)) {
      return region;
    }
  }
  
  return "default";
}

export function getRegionDisplayName(region: BrazilRegion): string {
  const names: Record<BrazilRegion, string> = {
    "sudeste_sp": "São Paulo",
    "sudeste_mg": "Minas Gerais",
    "sul": "Sul",
    "nordeste_norte": "Nordeste/Norte",
    "rio": "Rio de Janeiro",
    "default": "Brasil",
  };
  return names[region];
}
