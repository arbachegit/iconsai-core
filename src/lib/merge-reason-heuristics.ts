/**
 * Heurísticas para auto-sugestão de motivos de unificação de tags
 * Baseado em técnicas de Data Science para detecção de duplicatas
 */

export interface MergeReasons {
  synonymy: boolean;
  grammaticalVariation: boolean;
  spellingVariation: boolean;
  acronym: boolean;
  typo: boolean;
  languageEquivalence: boolean;
  generalization: boolean;
}

export interface SuggestedReasons {
  reasons: MergeReasons;
  confidence: number;
  explanations: string[];
}

// Levenshtein distance para detectar typos
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Normalizar texto para comparações
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[-_\s]+/g, '')         // Remove hífens, underscores, espaços
    .trim();
}

// Detectar se é sigla (uppercase)
function isAcronym(text: string): boolean {
  const cleaned = text.replace(/[^a-zA-Z]/g, '');
  return cleaned.length >= 2 && cleaned.length <= 6 && cleaned === cleaned.toUpperCase();
}

// Detectar padrão de plural em português
function detectPluralPattern(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Padrões comuns de plural em português
  const pluralPatterns = [
    // -s simples: carro/carros
    { singular: (s: string) => s, plural: (s: string) => s + 's' },
    // -es: flor/flores
    { singular: (s: string) => s, plural: (s: string) => s + 'es' },
    // -ão/-ões: coração/corações
    { singular: (s: string) => s.endsWith('ao') ? s : null, plural: (s: string) => s.replace(/oes$/, 'ao') },
    // -ão/-ães: pão/pães
    { singular: (s: string) => s.endsWith('ao') ? s : null, plural: (s: string) => s.replace(/aes$/, 'ao') },
    // -ão/-ãos: irmão/irmãos
    { singular: (s: string) => s.endsWith('ao') ? s : null, plural: (s: string) => s.replace(/aos$/, 'ao') },
    // -al/-ais: animal/animais
    { singular: (s: string) => s.endsWith('al') ? s : null, plural: (s: string) => s.replace(/ais$/, 'al') },
    // -el/-eis: papel/papéis
    { singular: (s: string) => s.endsWith('el') ? s : null, plural: (s: string) => s.replace(/eis$/, 'el') },
    // -il/-is: funil/funis (tônico)
    { singular: (s: string) => s.endsWith('il') ? s : null, plural: (s: string) => s.replace(/is$/, 'il') },
    // -ol/-óis: lençol/lençóis
    { singular: (s: string) => s.endsWith('ol') ? s : null, plural: (s: string) => s.replace(/ois$/, 'ol') },
    // -ul/-uis: paul/pauis
    { singular: (s: string) => s.endsWith('ul') ? s : null, plural: (s: string) => s.replace(/uis$/, 'ul') },
    // -m/-ns: homem/homens
    { singular: (s: string) => s.endsWith('m') ? s : null, plural: (s: string) => s.replace(/ns$/, 'm') },
    // -r/-res: flor/flores
    { singular: (s: string) => s.endsWith('r') ? s : null, plural: (s: string) => s.replace(/res$/, 'r') },
    // -z/-zes: luz/luzes
    { singular: (s: string) => s.endsWith('z') ? s : null, plural: (s: string) => s.replace(/zes$/, 'z') },
  ];

  // Verifica se um é plural do outro
  for (const pattern of pluralPatterns) {
    if (n1 + 's' === n2 || n2 + 's' === n1) return true;
    if (n1 + 'es' === n2 || n2 + 'es' === n1) return true;
  }

  // Verifica terminações específicas
  if ((n1.endsWith('s') && n1.slice(0, -1) === n2) ||
      (n2.endsWith('s') && n2.slice(0, -1) === n1)) {
    return true;
  }

  // -ões/-ão
  if ((n1.replace(/oes$/, 'ao') === n2) || (n2.replace(/oes$/, 'ao') === n1)) return true;
  // -ais/-al
  if ((n1.replace(/ais$/, 'al') === n2) || (n2.replace(/ais$/, 'al') === n1)) return true;
  // -eis/-el
  if ((n1.replace(/eis$/, 'el') === n2) || (n2.replace(/eis$/, 'el') === n1)) return true;
  // -ns/-m
  if ((n1.replace(/ns$/, 'm') === n2) || (n2.replace(/ns$/, 'm') === n1)) return true;

  return false;
}

// Detectar variação de grafia (acentos, hífens, etc.)
function detectSpellingVariation(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Se normalizados são iguais, mas originais diferentes = variação de grafia
  if (n1 === n2 && tag1.toLowerCase() !== tag2.toLowerCase()) {
    return true;
  }
  
  // Detectar variações com hífen: e-mail vs email
  const removeHyphens = (s: string) => s.replace(/-/g, '').toLowerCase();
  if (removeHyphens(tag1) === removeHyphens(tag2) && tag1 !== tag2) {
    return true;
  }
  
  return false;
}

// Detectar sigla vs extensão
function detectAcronymRelation(tag1: string, tag2: string): boolean {
  const t1 = tag1.trim();
  const t2 = tag2.trim();
  
  // Um é sigla, outro é texto longo
  const isT1Acronym = isAcronym(t1);
  const isT2Acronym = isAcronym(t2);
  
  if (isT1Acronym === isT2Acronym) return false; // Ambos são siglas ou nenhum é
  
  const acronym = isT1Acronym ? t1 : t2;
  const fullText = isT1Acronym ? t2 : t1;
  
  // Verificar se as iniciais do texto completo formam a sigla
  const words = fullText.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    const initials = words.map(w => w[0].toUpperCase()).join('');
    if (initials === acronym.toUpperCase()) {
      return true;
    }
  }
  
  return false;
}

// Detectar typo via Levenshtein
function detectTypo(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Se são muito diferentes em tamanho, provavelmente não é typo
  if (Math.abs(n1.length - n2.length) > 2) return false;
  
  // Calcular distância
  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  
  // Typo: distância baixa relativa ao tamanho
  // 1-2 caracteres de diferença em palavras de 5+ caracteres
  if (maxLength >= 5 && distance <= 2 && distance > 0) {
    return true;
  }
  
  // Para palavras curtas, apenas 1 caractere de diferença
  if (maxLength >= 3 && maxLength < 5 && distance === 1) {
    return true;
  }
  
  return false;
}

// Dicionário básico de equivalências PT-EN para healthcare
const languageEquivalents: Record<string, string[]> = {
  'saude': ['health', 'healthcare'],
  'paciente': ['patient'],
  'hospital': ['hospital'],
  'medico': ['doctor', 'physician'],
  'enfermeiro': ['nurse'],
  'tratamento': ['treatment'],
  'diagnostico': ['diagnosis'],
  'doenca': ['disease', 'illness'],
  'remedio': ['medicine', 'medication', 'drug'],
  'cirurgia': ['surgery'],
  'exame': ['exam', 'test'],
  'consulta': ['appointment', 'consultation'],
  'sintoma': ['symptom'],
  'vacina': ['vaccine'],
  'terapia': ['therapy'],
  'farmacia': ['pharmacy'],
  'emergencia': ['emergency'],
  'clinica': ['clinic'],
  'prontuario': ['medical record'],
  'receita': ['prescription'],
  'atendimento': ['care', 'service'],
  'internacao': ['hospitalization', 'admission'],
  'alta': ['discharge'],
  'uti': ['icu'],
  'pronto socorro': ['emergency room', 'er'],
};

function detectLanguageEquivalence(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  for (const [pt, enList] of Object.entries(languageEquivalents)) {
    const normalizedPt = normalize(pt);
    const normalizedEn = enList.map(e => normalize(e));
    
    if ((n1 === normalizedPt && normalizedEn.includes(n2)) ||
        (n2 === normalizedPt && normalizedEn.includes(n1))) {
      return true;
    }
  }
  
  return false;
}

// Detectar padrão de generalização (datas, números, etc.)
function detectGeneralizationPattern(tag1: string, tag2: string): boolean {
  // Padrões que indicam especificidade temporal
  const temporalPatterns = [
    /janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i,
    /jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i,
    /\d{4}/, // Anos
    /q[1-4]/i, // Quarters
    /\d{1,2}\/\d{1,2}/, // Datas
    /semana\s*\d+/i,
    /mes\s*\d+/i,
  ];
  
  const hasT1Temporal = temporalPatterns.some(p => p.test(tag1));
  const hasT2Temporal = temporalPatterns.some(p => p.test(tag2));
  
  // Se ambos têm padrões temporais diferentes, pode ser generalização
  if (hasT1Temporal && hasT2Temporal) {
    // Extrair a base comum (sem a parte temporal)
    const base1 = tag1.replace(/\d+/g, '').replace(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/gi, '').trim();
    const base2 = tag2.replace(/\d+/g, '').replace(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/gi, '').trim();
    
    if (normalize(base1) === normalize(base2) && base1.length > 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Função principal: analisa dois tags e sugere motivos de unificação
 */
export function suggestMergeReasons(tag1: string, tag2: string): SuggestedReasons {
  const reasons: MergeReasons = {
    synonymy: false,
    grammaticalVariation: false,
    spellingVariation: false,
    acronym: false,
    typo: false,
    languageEquivalence: false,
    generalization: false,
  };
  
  const explanations: string[] = [];
  let confidence = 0;
  
  // 1. Verificar variação gramatical (plural/singular)
  if (detectPluralPattern(tag1, tag2)) {
    reasons.grammaticalVariation = true;
    explanations.push(`Detectado padrão singular/plural: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.9;
  }
  
  // 2. Verificar variação de grafia
  if (detectSpellingVariation(tag1, tag2)) {
    reasons.spellingVariation = true;
    explanations.push(`Detectada variação de grafia/formatação: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.85;
  }
  
  // 3. Verificar sigla/acrônimo
  if (detectAcronymRelation(tag1, tag2)) {
    reasons.acronym = true;
    explanations.push(`Detectada relação sigla/extensão: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.95;
  }
  
  // 4. Verificar typo (apenas se não detectou outros padrões)
  if (!reasons.grammaticalVariation && !reasons.spellingVariation && !reasons.acronym) {
    if (detectTypo(tag1, tag2)) {
      reasons.typo = true;
      const distance = levenshteinDistance(normalize(tag1), normalize(tag2));
      explanations.push(`Possível erro de digitação (distância Levenshtein: ${distance}): "${tag1}" ↔ "${tag2}"`);
      confidence += 0.7;
    }
  }
  
  // 5. Verificar equivalência de idioma
  if (detectLanguageEquivalence(tag1, tag2)) {
    reasons.languageEquivalence = true;
    explanations.push(`Detectada equivalência PT-EN: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.9;
  }
  
  // 6. Verificar generalização
  if (detectGeneralizationPattern(tag1, tag2)) {
    reasons.generalization = true;
    explanations.push(`Detectado padrão de generalização temporal: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.75;
  }
  
  // Normalizar confidence para máximo 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    reasons,
    confidence,
    explanations
  };
}

/**
 * Analisa múltiplos tags e retorna sugestões agregadas
 */
export function suggestMergeReasonsForTags(tags: string[]): SuggestedReasons {
  if (tags.length < 2) {
    return {
      reasons: {
        synonymy: false,
        grammaticalVariation: false,
        spellingVariation: false,
        acronym: false,
        typo: false,
        languageEquivalence: false,
        generalization: false,
      },
      confidence: 0,
      explanations: []
    };
  }
  
  const aggregatedReasons: MergeReasons = {
    synonymy: false,
    grammaticalVariation: false,
    spellingVariation: false,
    acronym: false,
    typo: false,
    languageEquivalence: false,
    generalization: false,
  };
  
  const allExplanations: string[] = [];
  let maxConfidence = 0;
  
  // Comparar cada par de tags
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const result = suggestMergeReasons(tags[i], tags[j]);
      
      // Agregar razões
      Object.keys(result.reasons).forEach(key => {
        if (result.reasons[key as keyof MergeReasons]) {
          aggregatedReasons[key as keyof MergeReasons] = true;
        }
      });
      
      allExplanations.push(...result.explanations);
      maxConfidence = Math.max(maxConfidence, result.confidence);
    }
  }
  
  return {
    reasons: aggregatedReasons,
    confidence: maxConfidence,
    explanations: allExplanations
  };
}
