-- ============================================================
-- CLEANUP: Remove Only Dead Code Tables
-- Execute this in Supabase SQL Editor
-- Date: 2026-01-28
-- ============================================================
-- This script removes ONLY tables referenced by dead/unused code
-- All active tables are preserved
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ML/TAXONOMY SYSTEM (Edge Functions removidas)
-- ============================================================
DROP TABLE IF EXISTS ml_correlations CASCADE;
DROP TABLE IF EXISTS ml_restrictions CASCADE;
DROP TABLE IF EXISTS ml_tag_feedback CASCADE;
DROP TABLE IF EXISTS ml_tag_suggestions CASCADE;
DROP TABLE IF EXISTS tag_management_events CASCADE;
DROP TABLE IF EXISTS taxonomy_suggestions CASCADE;
DROP TABLE IF EXISTS taxonomy_metrics_daily CASCADE;
DROP TABLE IF EXISTS taxonomy_rules CASCADE;
DROP TABLE IF EXISTS profile_taxonomies CASCADE;

-- ============================================================
-- 2. DOCUMENT PROCESSING (Não usado)
-- ============================================================
DROP TABLE IF EXISTS document_routing_log CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documentation_sync_log CASCADE;
DROP TABLE IF EXISTS reclassification_jobs CASCADE;
DROP TABLE IF EXISTS document_onboarding_log CASCADE;

-- ============================================================
-- 3. WHATSAPP INTEGRATION (Desativado)
-- ============================================================
DROP TABLE IF EXISTS whatsapp_daily_metrics CASCADE;
DROP TABLE IF EXISTS whatsapp_tier_status CASCADE;
DROP TABLE IF EXISTS whatsapp_quality_events CASCADE;

-- ============================================================
-- 4. CRM/MARKET (Não implementado)
-- ============================================================
DROP TABLE IF EXISTS crm_visits CASCADE;
DROP TABLE IF EXISTS presentation_scripts CASCADE;
DROP TABLE IF EXISTS market_news CASCADE;

-- ============================================================
-- 5. GEOGRAPHIC DATA
-- ============================================================
-- NOTA: geo_*, pop_*, saneamento_*, escolas, estabelecimentos_saude
-- estão no banco brasil-data-hub, NÃO no iconsai-core
-- Apenas 'states' e 'municipios' podem existir como duplicatas locais
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;

-- ============================================================
-- 6. LEGACY ANALYTICS (Código morto)
-- ============================================================
DROP TABLE IF EXISTS rag_analytics CASCADE;
DROP TABLE IF EXISTS conversation_history CASCADE;
DROP TABLE IF EXISTS deterministic_analysis CASCADE;
DROP TABLE IF EXISTS economic_indicators_history CASCADE;

-- ============================================================
-- 7. LEGACY ADMIN/MONITORING (Funções removidas)
-- ============================================================
DROP TABLE IF EXISTS version_control CASCADE;
DROP TABLE IF EXISTS schema_audit_log CASCADE;
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS integrity_check_log CASCADE;
DROP TABLE IF EXISTS security_scan_results CASCADE;
DROP TABLE IF EXISTS api_test_staging CASCADE;

-- ============================================================
-- 8. LEGACY VOICE/SPEECH (Substituído por voice_frequency_analysis)
-- ============================================================
DROP TABLE IF EXISTS regional_tone_config CASCADE;
DROP TABLE IF EXISTS communication_styles CASCADE;
DROP TABLE IF EXISTS speech_humanization CASCADE;
DROP TABLE IF EXISTS agent_pronunciations CASCADE;
DROP TABLE IF EXISTS agent_phrases CASCADE;
DROP TABLE IF EXISTS regional_pronunciations CASCADE;

-- ============================================================
-- 9. LEGACY CONTENT (Não usado)
-- ============================================================
DROP TABLE IF EXISTS generated_images CASCADE;
DROP TABLE IF EXISTS section_contents CASCADE;
DROP TABLE IF EXISTS section_content_versions CASCADE;
DROP TABLE IF EXISTS vimeo_videos CASCADE;

-- ============================================================
-- 10. LEGACY NOTIFICATIONS (Estrutura não usada)
-- ============================================================
DROP TABLE IF EXISTS notification_fallback_logs CASCADE;
DROP TABLE IF EXISTS notification_fallback_config CASCADE;
DROP TABLE IF EXISTS notification_logic_config CASCADE;

-- ============================================================
-- 11. LEGACY PWA VARIANTS (Consolidados em pwa_*)
-- ============================================================
DROP TABLE IF EXISTS pwacity_sessions CASCADE;
DROP TABLE IF EXISTS pwacity_invites CASCADE;
DROP TABLE IF EXISTS pwahealth_sessions CASCADE;
DROP TABLE IF EXISTS pwahealth_invites CASCADE;
DROP TABLE IF EXISTS pwa_conversation_summaries CASCADE;

-- ============================================================
-- 12. OTHER LEGACY
-- ============================================================
DROP TABLE IF EXISTS context_profiles CASCADE;
DROP TABLE IF EXISTS context_detection_rules CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;
DROP TABLE IF EXISTS deep_search_knowledge CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS maieutic_training_categories CASCADE;
DROP TABLE IF EXISTS maieutic_metrics CASCADE;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE 'Remaining tables: %', v_count;
  RAISE NOTICE '=========================================';
END $$;

-- List remaining tables:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
