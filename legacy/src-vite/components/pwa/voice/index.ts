/**
 * ============================================================
 * index.ts - Exports dos Componentes PWA Voice
 * ============================================================
 * Versão: 4.0.0 - 2026-01-21
 * CLEANUP: Componentes legados REMOVIDOS
 * ============================================================
 */

// ============================================================
// COMPONENTES ATIVOS - MICROSERVIÇOS REUTILIZÁVEIS
// ============================================================

// Layout Unificado
export { UnifiedHeader } from "./UnifiedHeader";
export { UnifiedFooter } from "./UnifiedFooter";
export { FooterModules } from "./FooterModules";

// Visualização de Áudio (Microserviços)
export { SpectrumAnalyzer } from "./SpectrumAnalyzer";
export { PlayButton } from "./PlayButton";

// Microfone (Microserviço)
export { ToggleMicrophoneButton } from "./ToggleMicrophoneButton";
export { SlidingMicrophone } from "./SlidingMicrophone";

// Histórico
export { AudioMessageCard } from "./AudioMessageCard";
export { HistoryScreen } from "./HistoryScreen";

// Componentes Principais
export { PWAVoiceAssistant } from "./PWAVoiceAssistant";
export { ModuleSelector } from "./ModuleSelector";
export { SplashScreen } from "./SplashScreen";
export { ConversationDrawer } from "./ConversationDrawer";

// Player (ainda usado em alguns lugares)
export { VoicePlayerBox } from "./VoicePlayerBox";

// ============================================================
// TYPES
// ============================================================
export type { VisualizerState } from "./SpectrumAnalyzer";
export type { PlayButtonState } from "./PlayButton";
export type { MicrophoneState } from "./SlidingMicrophone";
