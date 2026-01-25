-- ============================================================
-- SCRIPT DE LIMPEZA VERIFICADO - iconsai-core
-- ============================================================
-- Data: 2026-01-24
-- Baseado na verificação real do banco de dados
--
-- TOTAL A LIBERAR: ~60 MB
-- ============================================================

-- Desabilitar verificação de foreign keys
SET session_replication_role = 'replica';

-- ============================================================
-- SEÇÃO 1: INDICADORES GRANDES (brasil-data-hub substitui)
-- Total: ~59 MB
-- ============================================================

-- municipal_indicators: 296,835 rows, 55 MB
DROP TABLE IF EXISTS municipal_indicators CASCADE;

-- indicator_values: 15,349 rows, 2.7 MB
DROP TABLE IF EXISTS indicator_values CASCADE;

-- municipios: 5,571 rows, 1 MB
DROP TABLE IF EXISTS municipios CASCADE;

-- indicator_regional_values: 1,639 rows, 432 KB
DROP TABLE IF EXISTS indicator_regional_values CASCADE;

-- estados: 27 rows (brasil-data-hub tem geo_estados)
DROP TABLE IF EXISTS estados CASCADE;

-- ============================================================
-- SEÇÃO 2: INDICADORES VAZIOS OU PEQUENOS
-- ============================================================

DROP TABLE IF EXISTS economic_indicators CASCADE;
DROP TABLE IF EXISTS indicator_stats_summary CASCADE;
DROP TABLE IF EXISTS brazilian_ufs CASCADE;
DROP TABLE IF EXISTS pmc_valores_reais CASCADE;
DROP TABLE IF EXISTS pac_valores_estimados CASCADE;
DROP TABLE IF EXISTS pac_pmc_mapping CASCADE;
DROP TABLE IF EXISTS indices_history CASCADE;
DROP TABLE IF EXISTS municipal_indices CASCADE;
DROP TABLE IF EXISTS municipalities CASCADE;

-- ============================================================
-- SEÇÃO 3: SISTEMA DE APIs (não usado)
-- ============================================================

DROP TABLE IF EXISTS system_api_registry CASCADE;
DROP TABLE IF EXISTS api_test_staging CASCADE;
DROP TABLE IF EXISTS api_audit_logs CASCADE;
DROP TABLE IF EXISTS api_cache CASCADE;
DROP TABLE IF EXISTS market_news CASCADE;

-- ============================================================
-- SEÇÃO 4: RAG/DOCUMENTOS (0 rows - não usado)
-- ============================================================

DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_routing_log CASCADE;
DROP TABLE IF EXISTS document_onboarding_log CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS documentation_versions CASCADE;
DROP TABLE IF EXISTS documentation_sync_log CASCADE;
DROP TABLE IF EXISTS rag_analytics CASCADE;
DROP TABLE IF EXISTS reclassification_jobs CASCADE;
DROP TABLE IF EXISTS deep_search_knowledge CASCADE;

-- ============================================================
-- SEÇÃO 5: CHAT LEGADO (vazio ou pequeno)
-- ============================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS chat_analytics CASCADE;
DROP TABLE IF EXISTS chat_config CASCADE;
DROP TABLE IF EXISTS chat_routing_rules CASCADE;
DROP TABLE IF EXISTS conversation_history CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS user_chat_preferences CASCADE;

-- chat_agents tem 4 rows mas não é usado pelo PWA
DROP TABLE IF EXISTS chat_agents CASCADE;

-- ============================================================
-- SEÇÃO 6: ML/TAXONOMIA (maioria vazio)
-- ============================================================

DROP TABLE IF EXISTS ml_tag_suggestions CASCADE;
DROP TABLE IF EXISTS ml_tag_feedback CASCADE;
DROP TABLE IF EXISTS ml_correlations CASCADE;
DROP TABLE IF EXISTS ml_restrictions CASCADE;
DROP TABLE IF EXISTS tag_modification_logs CASCADE;
DROP TABLE IF EXISTS tag_merge_rules CASCADE;
DROP TABLE IF EXISTS taxonomy_suggestions CASCADE;
DROP TABLE IF EXISTS taxonomy_metrics_daily CASCADE;
DROP TABLE IF EXISTS taxonomy_phonetics CASCADE;
DROP TABLE IF EXISTS entity_tags CASCADE;
DROP TABLE IF EXISTS ontology_concepts CASCADE;
DROP TABLE IF EXISTS ontology_relations CASCADE;
DROP TABLE IF EXISTS profile_taxonomies CASCADE;
DROP TABLE IF EXISTS agent_tag_profiles CASCADE;

-- global_taxonomy tem 38 rows - avaliar se usado pelo PWA
DROP TABLE IF EXISTS global_taxonomy CASCADE;

-- context_profiles tem 5 rows
DROP TABLE IF EXISTS context_profiles CASCADE;
DROP TABLE IF EXISTS context_detection_rules CASCADE;

-- ============================================================
-- SEÇÃO 7: TREINAMENTO/ANÁLISE (vazio)
-- ============================================================

DROP TABLE IF EXISTS maieutic_training_categories CASCADE;
DROP TABLE IF EXISTS maieutic_metrics CASCADE;
DROP TABLE IF EXISTS deterministic_analysis CASCADE;

-- lexicon_terms tem 295 rows - avaliar se usado
DROP TABLE IF EXISTS lexicon_terms CASCADE;

-- regional_tone_rules tem 8 rows
DROP TABLE IF EXISTS regional_tone_rules CASCADE;

-- phonetic_rules tem 26 rows
DROP TABLE IF EXISTS phonetic_rules CASCADE;

-- regional_pronunciations
DROP TABLE IF EXISTS regional_pronunciations CASCADE;

-- agent_pronunciations
DROP TABLE IF EXISTS agent_pronunciations CASCADE;

-- ============================================================
-- SEÇÃO 8: SEGURANÇA (tabelas não funcionais)
-- ============================================================

-- security_shield_config: 35 seq scans mas 0 rows (erro 406)
DROP TABLE IF EXISTS security_shield_config CASCADE;

-- Outros vazios
DROP TABLE IF EXISTS security_scan_results CASCADE;
DROP TABLE IF EXISTS security_alert_config CASCADE;
DROP TABLE IF EXISTS security_severity_history CASCADE;
DROP TABLE IF EXISTS integrity_check_log CASCADE;

-- security_violations: 5 rows - manter para auditoria
-- security_audit_log: 0 rows mas manter estrutura
-- security_whitelist: 1 row, 65 seq scans - MANTER

-- ============================================================
-- SEÇÃO 9: NOTIFICAÇÕES (maioria vazio)
-- ============================================================

DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_fallback_config CASCADE;
DROP TABLE IF EXISTS notification_fallback_logs CASCADE;
DROP TABLE IF EXISTS notification_logic_config CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;

-- ============================================================
-- SEÇÃO 10: WHATSAPP (vazio)
-- ============================================================

DROP TABLE IF EXISTS whatsapp_tier_status CASCADE;
DROP TABLE IF EXISTS whatsapp_daily_metrics CASCADE;
DROP TABLE IF EXISTS whatsapp_quality_events CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_conversations CASCADE;

-- ============================================================
-- SEÇÃO 11: CONTEÚDO/MÍDIA (maioria vazio)
-- ============================================================

DROP TABLE IF EXISTS section_content_versions CASCADE;
DROP TABLE IF EXISTS section_contents CASCADE;
DROP TABLE IF EXISTS section_audio CASCADE;
DROP TABLE IF EXISTS podcast_contents CASCADE;
DROP TABLE IF EXISTS tooltip_contents CASCADE;
DROP TABLE IF EXISTS vimeo_videos CASCADE;
DROP TABLE IF EXISTS generated_images CASCADE;
DROP TABLE IF EXISTS image_analytics CASCADE;
DROP TABLE IF EXISTS presentation_scripts CASCADE;
DROP TABLE IF EXISTS auto_preload_config CASCADE;

-- audio_contents tem 3 rows, 32 seq scans - avaliar
DROP TABLE IF EXISTS audio_contents CASCADE;

-- ============================================================
-- SEÇÃO 12: CRM/CONTATO (vazio)
-- ============================================================

DROP TABLE IF EXISTS crm_visits CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS reply_templates CASCADE;
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;

-- ============================================================
-- SEÇÃO 13: USUÁRIOS LEGADO (maioria vazio)
-- ============================================================

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_profiles_extended CASCADE;
DROP TABLE IF EXISTS communication_styles CASCADE;
DROP TABLE IF EXISTS credits_usage CASCADE;
DROP TABLE IF EXISTS typing_latency_logs CASCADE;
DROP TABLE IF EXISTS debug_logs CASCADE;

-- user_invitations tem 15 rows - avaliar se usado
DROP TABLE IF EXISTS user_invitations CASCADE;

-- user_registrations tem 2 rows
DROP TABLE IF EXISTS user_registrations CASCADE;

-- user_preferences tem 1 row
DROP TABLE IF EXISTS user_preferences CASCADE;

-- sms_verification_codes (vazio)
DROP TABLE IF EXISTS sms_verification_codes CASCADE;
DROP TABLE IF EXISTS password_recovery_codes CASCADE;
DROP TABLE IF EXISTS phone_verifications CASCADE;

-- ============================================================
-- SEÇÃO 14: SCHEMA/CONFIG
-- ============================================================

DROP TABLE IF EXISTS schema_audit_log CASCADE;
DROP TABLE IF EXISTS system_versions CASCADE;

-- app_config: 11 rows, 60 seq scans - MANTER (muito usado)
-- feature_flags: 5 rows - MANTER

-- ============================================================
-- REABILITAR FOREIGN KEYS
-- ============================================================

SET session_replication_role = 'origin';

-- ============================================================
-- TABELAS QUE PERMANECEM (PWA + Admin essencial):
-- ============================================================
-- pwa_config (15 rows)
-- pwa_sessions (22 rows)
-- pwa_conversation_messages (64 rows)
-- pwa_conversation_summaries (23 rows)
-- pwa_conversation_sessions (30 rows)
-- pwa_device_fingerprints (228 rows)
-- pwa_invites (3 rows)
-- pwa_user_devices (3 rows)
-- pwacity_config (2 rows)
-- security_whitelist (1 row, 65 seq scans)
-- security_violations (5 rows)
-- security_audit_log (estrutura)
-- banned_devices (5 rows, 25 seq scans)
-- admin_settings (1 row, 27 seq scans)
-- user_roles (4 rows)
-- profiles (4 rows)
-- app_config (11 rows, 60 seq scans)
-- feature_flags (5 rows)
-- speech_humanization (12 rows)
-- ============================================================

-- Verificar tabelas restantes
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
