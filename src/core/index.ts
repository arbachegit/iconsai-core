/**
 * ============================================================
 * Core - Exportação principal do módulo core
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * Este é o ponto de entrada principal para os primitivos core.
 * Módulos devem importar de @/core ou @/core/ui ou @/core/hooks
 * ============================================================
 */

// Types
export * from "./types";

// UI Components
export * from "./ui";

// Hooks
export * from "./hooks";

// ============================================================
// PWA Voice Platform - Agent Architecture
// ============================================================

// EventBus
export { EventBus, useEventBus } from "./EventBus";

// AudioEngine
export { AudioEngine, useAudioEngine } from "./AudioEngine";

// Core Components
export {
  UnifiedButton,
  SpectrumAnalyzer,
  ModuleHeader,
  HistoryButton,
  NavigationFooter,
} from "./components";

// Router
export { AgentRouter } from "./Router";

// Core App
export { CoreApp } from "./App";
