/**
 * ============================================================
 * PWA Config Admin Components - Index
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-22
 *
 * Exporta todos os componentes do painel de humanização de voz
 * ============================================================
 */

// Main Panel
export { VoiceHumanizationPanel } from './VoiceHumanizationPanel';
export { default as VoiceHumanizationPanelDefault } from './VoiceHumanizationPanel';

// Voice Selection
export { VoiceSelector } from './VoiceSelector';
export { default as VoiceSelectorDefault } from './VoiceSelector';

// Humanization Controls
export { HumanizationSliders } from './HumanizationSliders';
export type { HumanizationValues } from './HumanizationSliders';
export { default as HumanizationSlidersDefault } from './HumanizationSliders';

// Instructions Editor
export { InstructionsEditor } from './InstructionsEditor';
export { default as InstructionsEditorDefault } from './InstructionsEditor';

// Welcome Presets (Textos de Boas-vindas)
export { WelcomePresetsEditor, DEFAULT_WELCOME_PRESETS } from './WelcomePresetsEditor';
export type { WelcomePreset } from './WelcomePresetsEditor';
export { default as WelcomePresetsEditorDefault } from './WelcomePresetsEditor';

// Agent/Module Configuration
export { AgentVoiceConfig, DEFAULT_AGENT_CONFIGS } from './AgentVoiceConfig';
export type { AgentVoiceSettings } from './AgentVoiceConfig';
export { default as AgentVoiceConfigDefault } from './AgentVoiceConfig';

// Test Button
export { TestVoiceButton, TestVoiceButtonCompact } from './TestVoiceButton';
export { default as TestVoiceButtonDefault } from './TestVoiceButton';

// Comparison Table
export { VoiceComparisonTable } from './VoiceComparisonTable';
export { default as VoiceComparisonTableDefault } from './VoiceComparisonTable';

// Constants
export {
  ARBACHE_VOICES,
  DEFAULT_HUMANIZATION_VALUES,
  DEFAULT_TOGGLE_VALUES,
  MODULE_DEFAULT_VOICES,
  AVAILABLE_MODULES,
  TTS_MODEL_COMPARISON,
  HUMANIZATION_INSTRUCTIONS,
} from './voice-constants';
export type { VoiceOption } from './voice-constants';
