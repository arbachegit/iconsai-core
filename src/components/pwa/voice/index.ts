/**
 * ============================================================
 * index.ts - Exports dos Componentes PWA Voice
 * ============================================================
 * Versão: 2.0.0 - Limpeza de componentes obsoletos
 * Data: 2026-01-05
 * ============================================================
 */

// ============================================================
// COMPONENTES ATIVOS
// ============================================================

// Layout Unificado
export { UnifiedHeader } from "./UnifiedHeader";
export { UnifiedFooter } from "./UnifiedFooter";

// Visualização de Áudio
export { SpectrumAnalyzer } from "./SpectrumAnalyzer";
export { PlayButton } from "./PlayButton";
export { ReproduceLabel } from "./ReproduceLabel";

// Microfone
export { SlidingMicrophone } from "./SlidingMicrophone";
export { MicrophoneOverlay } from "./MicrophoneOverlay";

// Histórico
export { AudioMessageCard } from "./AudioMessageCard";
export { HistoryScreen } from "./HistoryScreen";

// Componentes Principais
export { PWAVoiceAssistant } from "./PWAVoiceAssistant";
export { ModuleSelector } from "./ModuleSelector";
export { SplashScreen } from "./SplashScreen";

// ============================================================
// TYPES
// ============================================================
export type { VisualizerState } from "./SpectrumAnalyzer";
export type { PlayButtonState } from "./PlayButton";
export type { MicrophoneState } from "./SlidingMicrophone";

// ============================================================
// COMPONENTES LEGADOS (Mantidos para compatibilidade)
// Estes componentes serão removidos em versões futuras.
// Não use em código novo.
// ============================================================

// @deprecated - Use UnifiedFooter
export { FooterModules } from "./FooterModules";

// @deprecated - Use UnifiedHeader  
export { HeaderActions } from "./HeaderActions";

// @deprecated - Use SlidingMicrophone
export { MicrophoneButton } from "./MicrophoneButton";
export { MicrophoneOrb } from "./MicrophoneOrb";

// @deprecated - Use UnifiedHeader
export { ModuleHeader } from "./ModuleHeader";

// @deprecated - Use PlayButton
export { VoicePlayerBox } from "./VoicePlayerBox";

// @deprecated - Não usado (interface 100% voz)
export { TranscriptArea } from "./TranscriptArea";

// @deprecated - Use SpectrumAnalyzer
export { WaveformVisualizer } from "./WaveformVisualizer";
export { StatusIndicator } from "./StatusIndicator";

// @deprecated - Use HistoryScreen
export { ConversationModal } from "./ConversationModal";

// @deprecated - Efeito visual não usado
export { CometBorder } from "./CometBorder";
