/**
 * ============================================================
 * voice-constants.ts - Constantes de Voz para Admin Panel
 * ============================================================
 * Versão: 1.1.0
 * Data: 2026-01-23
 *
 * Contém:
 * - Lista de 13 vozes Arbache AI Voice com características
 * - Valores default para sliders de humanização
 * - Instructions base por módulo
 * ============================================================
 */

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Feminina' | 'Masculina' | 'Neutra';
  characteristics: string;
  recommendations: string;
  color: string;
}

// 13 vozes Arbache AI Voice com características detalhadas
export const ARBACHE_VOICES: VoiceOption[] = [
  {
    id: 'alloy',
    name: 'Alice',
    gender: 'Neutra',
    characteristics: 'Versátil, equilibrada, neutra',
    recommendations: 'Uso geral, multiuso, adaptável',
    color: '#A0A0A0',
  },
  {
    id: 'ash',
    name: 'David',
    gender: 'Masculina',
    characteristics: 'Casual, amigável, relaxada',
    recommendations: 'Conversas informais, chat casual',
    color: '#636E72',
  },
  {
    id: 'ballad',
    name: 'Chris',
    gender: 'Masculina',
    characteristics: 'Melódica, expressiva, emotiva',
    recommendations: 'Narrativas, histórias, conteúdo emotivo',
    color: '#9B59B6',
  },
  {
    id: 'coral',
    name: 'Ariel',
    gender: 'Feminina',
    characteristics: 'Expressiva, energética, criativa',
    recommendations: 'Perfeita para módulo de ideias, brainstorming',
    color: '#FF6B6B',
  },
  {
    id: 'echo',
    name: 'Robin',
    gender: 'Masculina',
    characteristics: 'Paciente, clara, tutorial',
    recommendations: 'Perfeita para ajuda, tutoriais, explicações',
    color: '#6C9DFF',
  },
  {
    id: 'fable',
    name: 'Sam',
    gender: 'Neutra',
    characteristics: 'Narrativa, contadora de histórias',
    recommendations: 'Storytelling, conteúdo educativo infantil',
    color: '#F39C12',
  },
  {
    id: 'nova',
    name: 'Noah',
    gender: 'Feminina',
    characteristics: 'Calorosa, acolhedora, amigável',
    recommendations: 'Ideal para boas-vindas, home, atendimento geral',
    color: '#00D4FF',
  },
  {
    id: 'onyx',
    name: 'Jamie',
    gender: 'Masculina',
    characteristics: 'Grave, autoritária, séria',
    recommendations: 'Conteúdo formal, notícias, comunicados',
    color: '#2D3436',
  },
  {
    id: 'sage',
    name: 'Angel',
    gender: 'Masculina',
    characteristics: 'Educativa, informativa, sábia',
    recommendations: 'Ideal para módulo mundo, conhecimento, educação',
    color: '#95E1A3',
  },
  {
    id: 'shimmer',
    name: 'Dakota',
    gender: 'Feminina',
    characteristics: 'Suave, calma, reconfortante',
    recommendations: 'Excelente para saúde, bem-estar, meditação',
    color: '#E8B4FF',
  },
  {
    id: 'verse',
    name: 'Eden',
    gender: 'Feminina',
    characteristics: 'Poética, artística, elegante',
    recommendations: 'Conteúdo artístico, poesia, prosa',
    color: '#E17055',
  },
  {
    id: 'marin',
    name: 'Jesse',
    gender: 'Feminina',
    characteristics: 'Clara, profissional, confiável',
    recommendations: 'Boa para informações financeiras, dados',
    color: '#4ECDC4',
  },
  {
    id: 'cedar',
    name: 'Charlie',
    gender: 'Masculina',
    characteristics: 'Robusta, confiante, profissional',
    recommendations: 'Apresentações executivas, relatórios',
    color: '#8B4513',
  },
];

// Valores default para os sliders de humanização
export const DEFAULT_HUMANIZATION_VALUES = {
  warmth: 70,           // 0-100
  enthusiasm: 50,       // 0-100
  pace: 50,            // 0-100 (50 = normal)
  expressiveness: 60,  // 0-100
  formality: 30,       // 0-100 (baixo = casual)
  speed: 1.0,          // 0.5-1.5
};

// Valores default para toggles
export const DEFAULT_TOGGLE_VALUES = {
  fillerWords: true,      // Palavras de preenchimento (então, olha, sabe)
  naturalBreathing: true, // Pausas naturais de respiração
  emotionalResponses: true, // Respostas emocionais contextuais
};

// Mapeamento módulo -> voz padrão
export const MODULE_DEFAULT_VOICES: Record<string, string> = {
  home: 'nova',
  health: 'shimmer',
  ideas: 'coral',
  world: 'sage',
  help: 'echo',
  default: 'nova',
};

// Módulos disponíveis
export const AVAILABLE_MODULES = [
  { id: 'home', name: 'Home', icon: 'Home', color: '#00D4FF' },
  { id: 'health', name: 'Saúde', icon: 'Heart', color: '#FF6B6B' },
  { id: 'ideas', name: 'Ideias', icon: 'Lightbulb', color: '#F59E0B' },
  { id: 'world', name: 'Mundo', icon: 'Globe', color: '#10B981' },
  { id: 'help', name: 'Ajuda', icon: 'HelpCircle', color: '#6366F1' },
] as const;

// Comparação entre modelos TTS Arbache AI Voice
export const TTS_MODEL_COMPARISON = {
  'arbache-basic': {
    name: 'Arbache AI Voice Basic',
    description: 'Modelo básico de TTS',
    supportsInstructions: false,
    voiceAffect: false,
    emotion: false,
    pacing: false,
    fillerWords: false,
    breathing: false,
    quality: 'Básico',
    latency: 'Baixa',
    cost: '$',
  },
  'arbache-advanced': {
    name: 'Arbache AI Voice Advanced',
    description: 'Modelo avançado com instructions',
    supportsInstructions: true,
    voiceAffect: true,
    emotion: true,
    pacing: true,
    fillerWords: true,
    breathing: true,
    quality: 'Alta',
    latency: 'Média',
    cost: '$$',
  },
};

// Instructions base para cada parâmetro
export const HUMANIZATION_INSTRUCTIONS = {
  voiceAffect: 'Warm, calm, and genuinely welcoming.',
  tone: 'Conversational and caring, with natural warmth.',
  pacing: 'Natural and unhurried, with organic rhythm.',
  emotion: 'Subtly expressive with genuine warmth.',
  emphasis: 'Gently emphasize key words and questions.',
  demeanor: 'Patient, empathetic, and supportive.',
  enthusiasm: 'Measured but genuine engagement.',
  formality: 'Casual but respectful.',
  fillerWords: 'Use occasionally to sound natural - subtle "hm", "então", "olha".',
  intonation: 'Natural melodic variation typical of Brazilian Portuguese.',
  breathing: 'Include natural breath pauses.',
  connection: 'Speak as if making eye contact.',
};
