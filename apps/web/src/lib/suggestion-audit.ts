// Tabela suggestion_audit foi removida do banco
// Funções mantidas como no-ops para compatibilidade

interface SuggestionAuditData {
  sessionId: string;
  chatType: "health" | "study";
  userQuery: string;
  aiResponsePreview: string;
  suggestionsGenerated: string[];
  hasRagContext?: boolean;
  ragDocumentsUsed?: string[];
}

/**
 * Salva dados de auditoria de sugestões para análise de coerência contextual
 * NOTA: Tabela removida - função é no-op
 */
export async function saveSuggestionAudit(_data: SuggestionAuditData): Promise<void> {
  // No-op - tabela suggestion_audit foi removida
  return;
}

/**
 * Atualiza o score de coerência de uma auditoria existente
 * NOTA: Tabela removida - função é no-op
 */
export async function updateCoherenceScore(
  _auditId: string,
  _coherenceScore: number,
  _validated: boolean,
  _feedback?: string
): Promise<void> {
  // No-op - tabela suggestion_audit foi removida
  return;
}
