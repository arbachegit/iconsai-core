#!/bin/bash
# ============================================================
# SCRIPT DE LIMPEZA: Remoção de Arquivos Não Utilizados
# ============================================================
# Data: 2026-01-24
# Projeto: IconsAI Core - Isolamento do PWA
#
# Este script remove arquivos que dependem das tabelas deletadas
# Execute APÓS rodar cleanup-unused-tables.sql no Supabase
# ============================================================

set -e

echo "=============================================="
echo "LIMPEZA DE CÓDIGO - IconsAI Core"
echo "=============================================="
echo ""

# Diretório base
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR"

echo "Diretório base: $BASE_DIR"
echo ""

# ============================================================
# SEÇÃO 1: SERVIÇOS DE APIs/INDICADORES
# ============================================================
echo ">>> Removendo serviços de APIs/Indicadores..."

rm -f src/services/ibge-sidra-renda.ts
rm -f src/services/ipeadata-dolar.ts
rm -f src/services/ibge-*.ts
rm -f src/services/bcb-*.ts

echo "    - Serviços de APIs removidos"

# ============================================================
# SEÇÃO 2: HOOKS DE INDICADORES
# ============================================================
echo ">>> Removendo hooks de indicadores..."

rm -f src/hooks/useRealTimeIndicators.ts
rm -f src/hooks/useEconomicIndicators.ts

echo "    - Hooks de indicadores removidos"

# ============================================================
# SEÇÃO 3: COMPONENTES ADMIN (Indicadores)
# ============================================================
echo ">>> Removendo componentes Admin de indicadores..."

rm -f src/components/admin/EconomicIndicatorsTab.tsx
rm -f src/components/admin/DataAnalysisTab.tsx
rm -f src/components/admin/ChartDatabaseTab.tsx
rm -f src/components/admin/TableDatabaseTab.tsx
rm -f src/components/admin/RegionalIndicatorsTab.tsx
rm -f src/components/admin/PMCConversionTab.tsx
rm -f src/components/admin/MarketNewsTab.tsx
rm -f src/components/admin/RegionalConfigTab.tsx
rm -f src/components/admin/ApiManagementTab.tsx
rm -f src/components/admin/ApiDiagnosticModal.tsx
rm -f src/components/admin/ApiAuditLogsTab.tsx
rm -f src/components/admin/JsonTestTab.tsx
rm -f src/components/admin/JsonDataObservabilityTab.tsx
rm -rf src/components/admin/indicators/

echo "    - Componentes de indicadores removidos"

# ============================================================
# SEÇÃO 4: COMPONENTES ADMIN (RAG/Documentos)
# ============================================================
echo ">>> Removendo componentes Admin de RAG/Documentos..."

rm -f src/components/admin/DocumentsTab.tsx
rm -f src/components/admin/DocumentAnalysisTab.tsx
rm -f src/components/admin/DocumentOnboardingTab.tsx
rm -f src/components/admin/DocumentRoutingLogsTab.tsx
rm -f src/components/admin/DocumentRenameStats.tsx
rm -f src/components/admin/DocumentTagEnrichmentModal.tsx
rm -f src/components/admin/RagMetricsTab.tsx
rm -f src/components/admin/RagDiagnosticsTab.tsx
rm -f src/components/admin/DocumentationSyncTab.tsx
rm -f src/components/DocumentAttachButton.tsx

echo "    - Componentes RAG/Documentos removidos"

# ============================================================
# SEÇÃO 5: COMPONENTES ADMIN (ML/Taxonomia)
# ============================================================
echo ">>> Removendo componentes Admin de ML/Taxonomia..."

rm -f src/components/admin/MLDashboardTab.tsx
rm -f src/components/admin/MLLearningPatternsSection.tsx
rm -f src/components/admin/TagsManagementTab.tsx
rm -f src/components/admin/TagModificationLogsTab.tsx
rm -f src/components/admin/TagSuggestionReviewTab.tsx
rm -f src/components/admin/TagConflictResolutionModal.tsx
rm -f src/components/admin/TaxonomyAdoptionModal.tsx
rm -f src/components/admin/TaxonomyAnalyticsTab.tsx
rm -f src/components/admin/TaxonomyMLAuditTab.tsx
rm -f src/components/admin/OrphanedTagsPanel.tsx
rm -f src/components/admin/OntologyConceptsTab.tsx
rm -f src/components/admin/ContentProfilesTab.tsx
rm -f src/components/admin/SuggestionAuditTab.tsx
rm -rf src/components/admin/taxonomy-manager/
rm -rf src/components/admin/tags/
rm -rf src/components/admin/csv-import/

echo "    - Componentes ML/Taxonomia removidos"

# ============================================================
# SEÇÃO 6: COMPONENTES ADMIN (Treinamento)
# ============================================================
echo ">>> Removendo componentes Admin de Treinamento..."

rm -f src/components/admin/MaieuticTrainingTab.tsx
rm -f src/components/admin/MaieuticEffectivenessTab.tsx
rm -f src/components/admin/DeterministicAnalysisTab.tsx
rm -f src/components/admin/LexiconPhoneticsTab.tsx

echo "    - Componentes de Treinamento removidos"

# ============================================================
# SEÇÃO 7: COMPONENTES ADMIN (Notificações/WhatsApp)
# ============================================================
echo ">>> Removendo componentes Admin de Notificações..."

rm -f src/components/admin/NotificationSettingsTab.tsx
rm -f src/components/admin/NotificationLogsTab.tsx
rm -f src/components/admin/DeliveryMetricsTab.tsx
rm -f src/components/admin/FallbackConfigTab.tsx
rm -f src/components/admin/WhatsAppTierMonitorTab.tsx
rm -f src/components/admin/WhatsAppTierDashboard.tsx

echo "    - Componentes de Notificações removidos"

# ============================================================
# SEÇÃO 8: COMPONENTES ADMIN (Conteúdo/Mídia)
# ============================================================
echo ">>> Removendo componentes Admin de Conteúdo..."

rm -f src/components/admin/ContentManagementTab.tsx
rm -f src/components/admin/AudioPlayerCard.tsx
rm -f src/components/admin/AddAudioModal.tsx
rm -f src/components/admin/AddPodcastModal.tsx
rm -f src/components/admin/ManageAudiosModal.tsx
rm -f src/components/admin/PodcastManagementTab.tsx
rm -f src/components/admin/TooltipsTab.tsx
rm -f src/components/admin/VideosTab.tsx
rm -f src/components/admin/ImageCacheTab.tsx

echo "    - Componentes de Conteúdo removidos"

# ============================================================
# SEÇÃO 9: COMPONENTES ADMIN (CRM/Contato)
# ============================================================
echo ">>> Removendo componentes Admin de CRM..."

rm -f src/components/admin/CRMTab.tsx
rm -f src/components/admin/ContactMessagesTab.tsx

echo "    - Componentes CRM removidos"

# ============================================================
# SEÇÃO 10: COMPONENTES ADMIN (Usuários/Atividade)
# ============================================================
echo ">>> Removendo componentes Admin de Usuários..."

rm -f src/components/admin/InvitesTab.tsx
rm -f src/components/admin/InviteConversionStats.tsx
rm -f src/components/admin/InvitationChannelAuditTab.tsx
rm -f src/components/admin/UserRegistryTab.tsx
rm -f src/components/admin/UserUsageLogsTab.tsx
rm -f src/components/admin/ActivityLogsTab.tsx
rm -f src/components/admin/UserDeviceInfo.tsx

echo "    - Componentes de Usuários removidos"

# ============================================================
# SEÇÃO 11: COMPONENTES ADMIN (Analytics/Chat Legado)
# ============================================================
echo ">>> Removendo componentes Admin de Analytics/Chat Legado..."

rm -f src/components/admin/AnalyticsTab.tsx
rm -f src/components/admin/ConversationsTab.tsx
rm -f src/components/admin/DashboardTab.tsx
rm -f src/components/admin/AgentManagementTab.tsx
rm -f src/components/chat/AgentChat.tsx
rm -f src/components/ChatKnowYOU.tsx

echo "    - Componentes Analytics/Chat removidos"

# ============================================================
# SEÇÃO 12: COMPONENTES ADMIN (Segurança)
# ============================================================
echo ">>> Removendo componentes Admin de Segurança..."

rm -f src/components/admin/SecurityShieldConfigTab.tsx
rm -f src/components/admin/SecurityIntegrityTab.tsx
rm -f src/components/admin/SchemaMonitorTab.tsx

# Manter: SecurityDashboard, SecurityAuditLogsTab, SecurityWhitelist, SecurityUnifiedDashboard

echo "    - Componentes de Segurança (não funcionais) removidos"

# ============================================================
# SEÇÃO 13: LIBS NÃO UTILIZADAS
# ============================================================
echo ">>> Removendo libs não utilizadas..."

rm -f src/lib/security-shield.ts
rm -f src/lib/notification-dispatcher.ts
rm -f src/lib/tag-validation.ts
rm -f src/lib/tag-management-logger.ts
rm -f src/lib/suggestion-audit.ts
rm -f src/lib/document-title-utils.ts

echo "    - Libs removidas"

# ============================================================
# SEÇÃO 14: DASHBOARD COMPONENTS
# ============================================================
echo ">>> Removendo componentes de Dashboard..."

rm -f src/components/dashboard/StateDataPanel.tsx
rm -f src/components/dashboard/DataAnalyticsUF.tsx
rm -f src/components/dashboard/IndicatorAPITable.tsx

# Manter: DashboardSidebar (usa user_roles)

echo "    - Componentes de Dashboard removidos"

# ============================================================
# SEÇÃO 15: DOCUMENTAÇÃO RAG
# ============================================================
echo ">>> Removendo documentação RAG..."

rm -rf src/documentation/rag/

echo "    - Documentação RAG removida"

# ============================================================
# FINALIZAÇÃO
# ============================================================
echo ""
echo "=============================================="
echo "LIMPEZA CONCLUÍDA!"
echo "=============================================="
echo ""
echo "Próximos passos:"
echo "1. Revisar src/pages/Admin.tsx para remover imports"
echo "2. Revisar src/components/admin/AdminSidebar.tsx para remover links"
echo "3. Executar 'npm run build' para verificar erros"
echo "4. Commitar as mudanças"
echo ""
