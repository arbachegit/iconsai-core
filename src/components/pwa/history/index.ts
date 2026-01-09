/**
 * ============================================================
 * components/pwa/history/index.ts
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Histo_rico_objeto.zip
 * ============================================================
 */

export { MessageCard } from "./MessageCard";
export { DateSeparator } from "./DateSeparator";

// Re-export types
export type {
  HistoryMessage,
  MessageRole,
  ModuleType,
  MessageCardProps,
  HistoryScreenProps,
  MessagesByDate,
} from "@/types/pwa-history";

export {
  MESSAGE_COLORS,
  MESSAGE_TEXT_COLORS,
  MESSAGE_ICONS,
  MESSAGE_LABELS,
  MODULE_COLORS,
  MODULE_NAMES,
} from "@/types/pwa-history";
