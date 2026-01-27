-- ============================================================
-- CLEANUP COMPLETO: Remover Tabelas Herdadas + Limpar Novas
-- Execute no Supabase SQL Editor
-- Data: 2026-01-28
-- ============================================================
-- ATENÇÃO: Este script APAGA TODOS OS DADOS!
-- Apenas as tabelas da nova arquitetura serão mantidas (vazias)
-- ============================================================

BEGIN;

-- ============================================================
-- PARTE 1: LIMPAR TABELAS DA NOVA ARQUITETURA (TRUNCATE)
-- Estas tabelas serão mantidas, mas sem dados herdados
-- ============================================================

-- User Management (nova arquitetura)
DO $$ BEGIN
  TRUNCATE TABLE public.institutions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.departments CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.platform_users CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.user_invites CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.voice_frequency_analysis CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.user_voice_baseline CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- PWA Core (nova arquitetura - 20260127)
DO $$ BEGIN
  TRUNCATE TABLE public.pwa_sessions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.pwa_conversations CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.pwa_user_activity CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.pwa_home_agents CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  TRUNCATE TABLE public.iconsai_agents CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- PARTE 2: APAGAR TABELAS HERDADAS (DROP)
-- ============================================================

-- 2.1 Tabelas PWA Duplicadas (nomenclatura antiga)
DROP TABLE IF EXISTS public.pwa_conversation_messages CASCADE;
DROP TABLE IF EXISTS public.pwa_conversation_sessions CASCADE;
DROP TABLE IF EXISTS public.pwa_conversation_summaries CASCADE;
DROP TABLE IF EXISTS public.pwa_conv_summaries CASCADE;
DROP TABLE IF EXISTS public.pwa_messages CASCADE;

-- 2.2 Configurações Legacy
DROP TABLE IF EXISTS public.admin_settings CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;
DROP TABLE IF EXISTS public.pwa_config CASCADE;
DROP TABLE IF EXISTS public.pwacity_config CASCADE;
DROP TABLE IF EXISTS public.pwahealth_config CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;

-- 2.3 Security Legacy
DROP TABLE IF EXISTS public.banned_devices CASCADE;
DROP TABLE IF EXISTS public.security_audit_log CASCADE;
DROP TABLE IF EXISTS public.security_violations CASCADE;
DROP TABLE IF EXISTS public.security_whitelist CASCADE;
DROP TABLE IF EXISTS public.security_alert_config CASCADE;
DROP TABLE IF EXISTS public.security_severity_history CASCADE;
DROP TABLE IF EXISTS public.security_scan_results CASCADE;
DROP TABLE IF EXISTS public.integrity_check_log CASCADE;

-- 2.4 User/Profile Legacy
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.pwa_user_devices CASCADE;
DROP TABLE IF EXISTS public.pwa_device_fingerprints CASCADE;
DROP TABLE IF EXISTS public.pwa_invites CASCADE;
DROP TABLE IF EXISTS public.pwa_users CASCADE;
DROP TABLE IF EXISTS public.user_contacts CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_registrations CASCADE;
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.context_profiles CASCADE;
DROP TABLE IF EXISTS public.context_detection_rules CASCADE;

-- 2.5 Speech/Voice Legacy
DROP TABLE IF EXISTS public.speech_humanization CASCADE;
DROP TABLE IF EXISTS public.communication_styles CASCADE;
DROP TABLE IF EXISTS public.regional_tone_config CASCADE;
DROP TABLE IF EXISTS public.region_tone_config CASCADE;
DROP TABLE IF EXISTS public.agent_pronunciations CASCADE;
DROP TABLE IF EXISTS public.agent_phrases CASCADE;
DROP TABLE IF EXISTS public.regional_pronunciations CASCADE;
DROP TABLE IF EXISTS public.regional_tone_rules CASCADE;
DROP TABLE IF EXISTS public.pwa_agent_voice_config CASCADE;

-- 2.6 Chat/Agents Legacy
DROP TABLE IF EXISTS public.chat_agents CASCADE;
DROP TABLE IF EXISTS public.chat_config CASCADE;
DROP TABLE IF EXISTS public.chat_routing_rules CASCADE;
DROP TABLE IF EXISTS public.conversation_history CASCADE;

-- 2.7 Notifications Legacy
DROP TABLE IF EXISTS public.notification_logs CASCADE;
DROP TABLE IF EXISTS public.notification_fallback_logs CASCADE;
DROP TABLE IF EXISTS public.notification_fallback_config CASCADE;
DROP TABLE IF EXISTS public.notification_logic_config CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.admin_notifications CASCADE;

-- 2.8 Documents Legacy
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.document_tags CASCADE;
DROP TABLE IF EXISTS public.document_chunks CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.document_routing_log CASCADE;
DROP TABLE IF EXISTS public.document_onboarding_log CASCADE;
DROP TABLE IF EXISTS public.documentation_sync_log CASCADE;
DROP TABLE IF EXISTS public.documentation_versions CASCADE;
DROP TABLE IF EXISTS public.reclassification_jobs CASCADE;

-- 2.9 Taxonomy/ML Legacy
DROP TABLE IF EXISTS public.global_taxonomy CASCADE;
DROP TABLE IF EXISTS public.taxonomy_suggestions CASCADE;
DROP TABLE IF EXISTS public.taxonomy_metrics_daily CASCADE;
DROP TABLE IF EXISTS public.taxonomy_rules CASCADE;
DROP TABLE IF EXISTS public.taxonomy_phonetics CASCADE;
DROP TABLE IF EXISTS public.profile_taxonomies CASCADE;
DROP TABLE IF EXISTS public.ml_correlations CASCADE;
DROP TABLE IF EXISTS public.ml_restrictions CASCADE;
DROP TABLE IF EXISTS public.ml_tag_suggestions CASCADE;
DROP TABLE IF EXISTS public.ml_tag_feedback CASCADE;
DROP TABLE IF EXISTS public.tag_merge_rules CASCADE;
DROP TABLE IF EXISTS public.tag_management_events CASCADE;
DROP TABLE IF EXISTS public.tag_modification_logs CASCADE;
DROP TABLE IF EXISTS public.suggestion_audit CASCADE;
DROP TABLE IF EXISTS public.entity_tags CASCADE;
DROP TABLE IF EXISTS public.agent_tag_profiles CASCADE;

-- 2.10 Analytics/Logs Legacy
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.typing_latency_logs CASCADE;
DROP TABLE IF EXISTS public.user_activity_logs CASCADE;
DROP TABLE IF EXISTS public.api_audit_logs CASCADE;
DROP TABLE IF EXISTS public.rag_analytics CASCADE;
DROP TABLE IF EXISTS public.deterministic_analysis CASCADE;
DROP TABLE IF EXISTS public.invitation_channel_audit CASCADE;
DROP TABLE IF EXISTS public.schema_audit_log CASCADE;
DROP TABLE IF EXISTS public.version_control CASCADE;
DROP TABLE IF EXISTS public.system_versions CASCADE;

-- 2.11 Economic/Indicators Legacy
DROP TABLE IF EXISTS public.economic_indicators CASCADE;
DROP TABLE IF EXISTS public.economic_indicators_history CASCADE;
DROP TABLE IF EXISTS public.indicator_values CASCADE;
DROP TABLE IF EXISTS public.indicator_regional_values CASCADE;
DROP TABLE IF EXISTS public.indicator_stats_summary CASCADE;
DROP TABLE IF EXISTS public.pac_pmc_mapping CASCADE;
DROP TABLE IF EXISTS public.pac_valores_estimados CASCADE;
DROP TABLE IF EXISTS public.pmc_valores_reais CASCADE;

-- 2.12 Content Legacy
DROP TABLE IF EXISTS public.section_contents CASCADE;
DROP TABLE IF EXISTS public.section_content_versions CASCADE;
DROP TABLE IF EXISTS public.tooltip_contents CASCADE;
DROP TABLE IF EXISTS public.audio_contents CASCADE;
DROP TABLE IF EXISTS public.reply_templates CASCADE;
DROP TABLE IF EXISTS public.generated_images CASCADE;
DROP TABLE IF EXISTS public.vimeo_videos CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;

-- 2.13 Geographic Legacy (duplicatas locais)
DROP TABLE IF EXISTS public.states CASCADE;
DROP TABLE IF EXISTS public.municipios CASCADE;
DROP TABLE IF EXISTS public.brazilian_ufs CASCADE;

-- 2.14 WhatsApp/CRM Legacy
DROP TABLE IF EXISTS public.whatsapp_daily_metrics CASCADE;
DROP TABLE IF EXISTS public.whatsapp_tier_status CASCADE;
DROP TABLE IF EXISTS public.whatsapp_quality_events CASCADE;
DROP TABLE IF EXISTS public.crm_visits CASCADE;
DROP TABLE IF EXISTS public.contact_messages CASCADE;
DROP TABLE IF EXISTS public.market_news CASCADE;
DROP TABLE IF EXISTS public.presentation_scripts CASCADE;

-- 2.15 Ontology/Maieutic Legacy
DROP TABLE IF EXISTS public.ontology_concepts CASCADE;
DROP TABLE IF EXISTS public.ontology_relations CASCADE;
DROP TABLE IF EXISTS public.maieutic_training_categories CASCADE;
DROP TABLE IF EXISTS public.maieutic_metrics CASCADE;
DROP TABLE IF EXISTS public.deep_search_knowledge CASCADE;
DROP TABLE IF EXISTS public.lexicon_terms CASCADE;
DROP TABLE IF EXISTS public.phonetic_rules CASCADE;

-- 2.16 API/System Legacy
DROP TABLE IF EXISTS public.system_api_registry CASCADE;
DROP TABLE IF EXISTS public.api_test_staging CASCADE;
DROP TABLE IF EXISTS public.password_recovery_codes CASCADE;

-- 2.17 PWA Variants Legacy
DROP TABLE IF EXISTS public.pwacity_sessions CASCADE;
DROP TABLE IF EXISTS public.pwacity_invites CASCADE;
DROP TABLE IF EXISTS public.pwacity_conversations CASCADE;
DROP TABLE IF EXISTS public.pwahealth_sessions CASCADE;
DROP TABLE IF EXISTS public.pwahealth_invites CASCADE;
DROP TABLE IF EXISTS public.pwahealth_conversations CASCADE;
DROP TABLE IF EXISTS public.pwa_user_context CASCADE;

-- ============================================================
-- PARTE 3: LIMPAR TYPES ÓRFÃOS
-- ============================================================
DROP TYPE IF EXISTS public.emotion_type CASCADE;
DROP TYPE IF EXISTS public.contour_type CASCADE;
DROP TYPE IF EXISTS public.audio_type CASCADE;
DROP TYPE IF EXISTS public.notification_channel CASCADE;
DROP TYPE IF EXISTS public.security_action_type CASCADE;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO
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
  RAISE NOTICE 'CLEANUP COMPLETO!';
  RAISE NOTICE 'Tabelas restantes: %', v_count;
  RAISE NOTICE '=========================================';
END $$;

-- Listar tabelas restantes (devem ser apenas as da nova arquitetura)
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- TABELAS ESPERADAS APÓS CLEANUP:
-- ============================================================
-- 1.  institutions
-- 2.  departments
-- 3.  platform_users
-- 4.  user_invites
-- 5.  voice_frequency_analysis
-- 6.  user_voice_baseline
-- 7.  pwa_sessions
-- 8.  pwa_conversations
-- 9.  pwa_user_activity
-- 10. pwa_home_agents
-- 11. iconsai_agents
-- 12. user_roles
-- ============================================================
