// ============================================
// CONFIGURAÇÃO DE VOZ OPENAI - KNOWYOU PWA
// Versão: 1.0.0 - 2026-01-22
// Modelo: gpt-4o-mini-tts com instructions
// ============================================

export interface VoiceConfig {
  model: 'gpt-4o-mini-tts' | 'tts-1' | 'tts-1-hd';
  voice: OpenAIVoice;
  speed: number; // 0.25 a 4.0
  instructions: string;
  responseFormat: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export type OpenAIVoice =
  | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo'
  | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer'
  | 'verse' | 'marin' | 'cedar';

// ============================================
// PRESETS DE VOZ HUMANIZADA
// ============================================

export const VOICE_PRESETS = {
  // Voz principal - Assistente amigável em português
  friendly_assistant: {
    model: 'gpt-4o-mini-tts' as const,
    voice: 'marin' as OpenAIVoice,
    speed: 1.0,
    responseFormat: 'mp3' as const,
    instructions: `
Voice Affect: Warm, friendly, and naturally conversational.
Tone: Approachable and helpful, like a knowledgeable friend.
Pacing: Natural rhythm with appropriate pauses for comprehension.
Emotion: Genuinely interested and engaged, with subtle enthusiasm.
Emphasis: Highlight key information naturally without being overly dramatic.
Pronunciation: Clear and precise, especially for technical terms.
Language: Speak in Brazilian Portuguese with natural intonation.
Avoid: Robotic monotone, rushed speech, artificial pauses.
    `.trim()
  },

  // Voz calma para Health
  calm_health: {
    model: 'gpt-4o-mini-tts' as const,
    voice: 'cedar' as OpenAIVoice,
    speed: 0.95,
    responseFormat: 'mp3' as const,
    instructions: `
Voice Affect: Calm, reassuring, and empathetic.
Tone: Professional yet warm, like a caring healthcare provider.
Pacing: Slower, measured pace allowing time to process information.
Emotion: Compassionate and understanding, never dismissive.
Emphasis: Gentle stress on important health information.
Language: Speak in Brazilian Portuguese with natural intonation.
Avoid: Rushed delivery, clinical coldness, alarm-inducing tone.
    `.trim()
  },

  // Voz energética para Ideas
  creative_ideas: {
    model: 'gpt-4o-mini-tts' as const,
    voice: 'nova' as OpenAIVoice,
    speed: 1.05,
    responseFormat: 'mp3' as const,
    instructions: `
Voice Affect: Energetic, inspiring, and creative.
Tone: Enthusiastic and encouraging, sparking excitement.
Pacing: Dynamic rhythm that builds momentum with ideas.
Emotion: Genuinely excited about possibilities and innovation.
Emphasis: Highlight creative concepts with natural enthusiasm.
Language: Speak in Brazilian Portuguese with natural intonation.
Avoid: Over-the-top excitement, monotone delivery, condescension.
    `.trim()
  },

  // Voz informativa para World/Help
  informative: {
    model: 'gpt-4o-mini-tts' as const,
    voice: 'sage' as OpenAIVoice,
    speed: 1.0,
    responseFormat: 'mp3' as const,
    instructions: `
Voice Affect: Knowledgeable, clear, and engaging.
Tone: Educational but never condescending, like a great teacher.
Pacing: Steady pace with natural pauses between key points.
Emotion: Curious and interested in sharing knowledge.
Emphasis: Clear stress on important facts and concepts.
Language: Speak in Brazilian Portuguese with natural intonation.
Avoid: Lecturing tone, rushing through complex topics, monotony.
    `.trim()
  },

  // Voz padrão em Português Brasileiro
  portuguese_br: {
    model: 'gpt-4o-mini-tts' as const,
    voice: 'marin' as OpenAIVoice,
    speed: 1.0,
    responseFormat: 'mp3' as const,
    instructions: `
Voice Affect: Calorosa, amigável e naturalmente conversacional.
Tone: Acessível e prestativa, como um amigo conhecedor.
Pacing: Ritmo natural com pausas apropriadas para compreensão.
Emotion: Genuinamente interessada e engajada, com entusiasmo sutil.
Pronunciation: Clara e precisa, respeitando o português brasileiro.
Language: Speak in Brazilian Portuguese with natural intonation and accent.
Emphasis: Destacar informações importantes de forma natural.
Avoid: Monotonia robótica, fala apressada, pausas artificiais.
    `.trim()
  }
} as const;

// ============================================
// CONFIGURAÇÃO PADRÃO
// ============================================

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  model: 'gpt-4o-mini-tts',
  voice: 'marin',
  speed: 1.0,
  responseFormat: 'mp3',
  instructions: VOICE_PRESETS.portuguese_br.instructions
};

// ============================================
// VOZES DISPONÍVEIS PARA UI
// ============================================

export const AVAILABLE_VOICES: Array<{
  id: OpenAIVoice;
  name: string;
  description: string;
  recommended?: boolean;
}> = [
  { id: 'marin', name: 'Marin', description: 'Calorosa e natural', recommended: true },
  { id: 'cedar', name: 'Cedar', description: 'Calma e reconfortante', recommended: true },
  { id: 'coral', name: 'Coral', description: 'Versátil e equilibrada' },
  { id: 'nova', name: 'Nova', description: 'Enérgica e jovem' },
  { id: 'alloy', name: 'Alloy', description: 'Neutra e profissional' },
  { id: 'ash', name: 'Ash', description: 'Suave e tranquila' },
  { id: 'sage', name: 'Sage', description: 'Sábia e educativa' },
  { id: 'shimmer', name: 'Shimmer', description: 'Brilhante e alegre' },
  { id: 'echo', name: 'Echo', description: 'Neutra e clara' },
  { id: 'fable', name: 'Fable', description: 'Narrativa e envolvente' },
  { id: 'onyx', name: 'Onyx', description: 'Grave e séria' },
  { id: 'ballad', name: 'Ballad', description: 'Expressiva e musical' },
  { id: 'verse', name: 'Verse', description: 'Artística e criativa' }
];

// ============================================
// MAPEAMENTO MÓDULO -> PRESET
// ============================================

export const MODULE_VOICE_PRESETS: Record<string, keyof typeof VOICE_PRESETS> = {
  'home': 'portuguese_br',
  'health': 'calm_health',
  'ideas': 'creative_ideas',
  'world': 'informative',
  'help': 'friendly_assistant',
  'default': 'portuguese_br'
};

/**
 * Obtém o preset de voz para um módulo específico
 */
export function getVoicePresetForModule(module: string): typeof VOICE_PRESETS[keyof typeof VOICE_PRESETS] {
  const presetKey = MODULE_VOICE_PRESETS[module] || MODULE_VOICE_PRESETS.default;
  return VOICE_PRESETS[presetKey];
}
