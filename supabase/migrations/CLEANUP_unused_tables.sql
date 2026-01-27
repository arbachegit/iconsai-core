-- ============================================================
-- CLEANUP: Remove Unused Tables
-- Execute this in Supabase SQL Editor
-- Date: 2026-01-28
-- ============================================================
-- WARNING: This will permanently delete data!
-- Make sure you have backups before running.
-- ============================================================

-- First, let's see what tables exist
-- Run this SELECT first to review:
/*
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
*/

-- ============================================================
-- TABLES TO KEEP (Core functionality)
-- ============================================================
-- PWA Core:
--   pwa_sessions, pwa_conversations, pwa_user_activity,
--   pwa_device_fingerprints, pwa_config, pwa_home_agents,
--   pwa_agent_voice_config, pwa_conversation_sessions,
--   pwa_conversation_messages, pwa_conv_summaries
--
-- User Management (NEW):
--   institutions, departments, platform_users, user_invites,
--   voice_frequency_analysis, user_voice_baseline
--
-- Auth & Security:
--   user_roles, profiles, security_whitelist, security_audit_log,
--   admin_settings, app_config
--
-- Documents & Content:
--   documents, document_tags, document_chunks
--
-- Core Data:
--   economic_indicators, indicator_values, system_api_registry,
--   brazilian_ufs, chat_agents, global_taxonomy
-- ============================================================

BEGIN;

-- ============================================================
-- DROP UNUSED TABLES
-- ============================================================

-- Legacy PWA variants (replaced by unified pwa_* tables)
DROP TABLE IF EXISTS pwacity_conversations CASCADE;
DROP TABLE IF EXISTS pwacity_sessions CASCADE;
DROP TABLE IF EXISTS pwacity_invites CASCADE;
DROP TABLE IF EXISTS pwacity_config CASCADE;
DROP TABLE IF EXISTS pwahealth_conversations CASCADE;
DROP TABLE IF EXISTS pwahealth_sessions CASCADE;
DROP TABLE IF EXISTS pwahealth_invites CASCADE;
DROP TABLE IF EXISTS pwahealth_config CASCADE;
DROP TABLE IF EXISTS pwa_devices CASCADE;
DROP TABLE IF EXISTS pwa_user_devices CASCADE;
-- KEEP: pwa_invites (used in PWARegisterPage, PWAInvitesManager)
-- KEEP: pwa_users (used in PWAInvitesManager)
-- KEEP: pwa_messages (used in historyStore, chat-router)
DROP TABLE IF EXISTS pwa_user_context CASCADE;
DROP TABLE IF EXISTS pwa_conversation_summaries CASCADE;

-- Notification system (keep notification_logs - used by many functions)
DROP TABLE IF EXISTS notification_fallback_logs CASCADE;
DROP TABLE IF EXISTS notification_fallback_config CASCADE;
DROP TABLE IF EXISTS notification_logic_config CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
-- KEEP: notification_logs (used in Edge Functions)
DROP TABLE IF EXISTS admin_notifications CASCADE;

-- Email system (not implemented)
DROP TABLE IF EXISTS email_templates CASCADE;

-- Security tables (redundant/unused)
DROP TABLE IF EXISTS security_alert_config CASCADE;
DROP TABLE IF EXISTS security_severity_history CASCADE;
DROP TABLE IF EXISTS security_violations CASCADE;
DROP TABLE IF EXISTS security_scan_results CASCADE;
DROP TABLE IF EXISTS banned_devices CASCADE;
DROP TABLE IF EXISTS integrity_check_log CASCADE;

-- Speech/Voice legacy (replaced by new voice_frequency_analysis)
DROP TABLE IF EXISTS communication_styles CASCADE;
DROP TABLE IF EXISTS speech_humanization CASCADE;
DROP TABLE IF EXISTS region_tone_config CASCADE;
DROP TABLE IF EXISTS agent_pronunciations CASCADE;
DROP TABLE IF EXISTS agent_phrases CASCADE;
DROP TABLE IF EXISTS regional_pronunciations CASCADE;
DROP TABLE IF EXISTS regional_tone_rules CASCADE;
DROP TABLE IF EXISTS taxonomy_phonetics CASCADE;
DROP TABLE IF EXISTS phonetic_rules CASCADE;
DROP TABLE IF EXISTS lexicon_terms CASCADE;

-- Content/Section system (unused)
DROP TABLE IF EXISTS section_content_versions CASCADE;
DROP TABLE IF EXISTS section_contents CASCADE;
DROP TABLE IF EXISTS tooltip_contents CASCADE;
DROP TABLE IF EXISTS audio_contents CASCADE;
DROP TABLE IF EXISTS reply_templates CASCADE;
DROP TABLE IF EXISTS generated_images CASCADE;
DROP TABLE IF EXISTS vimeo_videos CASCADE;

-- Taxonomy/ML system (unused or legacy)
DROP TABLE IF EXISTS taxonomy_metrics_daily CASCADE;
DROP TABLE IF EXISTS taxonomy_suggestions CASCADE;
DROP TABLE IF EXISTS taxonomy_rules CASCADE;
DROP TABLE IF EXISTS profile_taxonomies CASCADE;
DROP TABLE IF EXISTS ml_correlations CASCADE;
DROP TABLE IF EXISTS ml_restrictions CASCADE;
DROP TABLE IF EXISTS ml_tag_suggestions CASCADE;
DROP TABLE IF EXISTS ml_tag_feedback CASCADE;
DROP TABLE IF EXISTS tag_merge_rules CASCADE;
DROP TABLE IF EXISTS tag_management_events CASCADE;
DROP TABLE IF EXISTS tag_modification_logs CASCADE;
DROP TABLE IF EXISTS suggestion_audit CASCADE;
DROP TABLE IF EXISTS entity_tags CASCADE;
DROP TABLE IF EXISTS agent_tag_profiles CASCADE;

-- Document processing (unused)
DROP TABLE IF EXISTS document_onboarding_log CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documentation_versions CASCADE;
DROP TABLE IF EXISTS documentation_sync_log CASCADE;
DROP TABLE IF EXISTS reclassification_jobs CASCADE;

-- Context/Profile system (unused)
DROP TABLE IF EXISTS context_profiles CASCADE;
DROP TABLE IF EXISTS context_detection_rules CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_registrations CASCADE;
-- KEEP: user_invitations (used in InvitePage, InvitesTab, Edge Functions)

-- Analytics/Logs (keep activity_logs - used in ActivityLogsTab)
DROP TABLE IF EXISTS typing_latency_logs CASCADE;
-- KEEP: activity_logs (used in ActivityLogsTab)
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS api_audit_logs CASCADE;
DROP TABLE IF EXISTS invitation_channel_audit CASCADE;
DROP TABLE IF EXISTS schema_audit_log CASCADE;
DROP TABLE IF EXISTS version_control CASCADE;
DROP TABLE IF EXISTS system_versions CASCADE;

-- Chat/Routing (unused)
DROP TABLE IF EXISTS chat_routing_rules CASCADE;
DROP TABLE IF EXISTS chat_config CASCADE;
DROP TABLE IF EXISTS conversation_history CASCADE;

-- Ontology (unused)
DROP TABLE IF EXISTS ontology_concepts CASCADE;
DROP TABLE IF EXISTS ontology_relations CASCADE;

-- Maieutic system (unused)
DROP TABLE IF EXISTS maieutic_training_categories CASCADE;
DROP TABLE IF EXISTS maieutic_metrics CASCADE;
DROP TABLE IF EXISTS deterministic_analysis CASCADE;

-- WhatsApp (unused)
DROP TABLE IF EXISTS whatsapp_daily_metrics CASCADE;
DROP TABLE IF EXISTS whatsapp_tier_status CASCADE;
DROP TABLE IF EXISTS whatsapp_quality_events CASCADE;

-- CRM (unused)
DROP TABLE IF EXISTS crm_visits CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;

-- Market/News (unused)
DROP TABLE IF EXISTS market_news CASCADE;
DROP TABLE IF EXISTS presentation_scripts CASCADE;

-- Deep search (unused)
DROP TABLE IF EXISTS deep_search_knowledge CASCADE;

-- Geographic duplicates (keep geo_* versions)
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;

-- Economic data (keep only core)
DROP TABLE IF EXISTS pac_pmc_mapping CASCADE;
DROP TABLE IF EXISTS pac_valores_estimados CASCADE;
DROP TABLE IF EXISTS pmc_valores_reais CASCADE;
DROP TABLE IF EXISTS indicator_regional_values CASCADE;
DROP TABLE IF EXISTS indicator_stats_summary CASCADE;

-- API/Testing (unused)
DROP TABLE IF EXISTS api_test_staging CASCADE;
DROP TABLE IF EXISTS password_recovery_codes CASCADE;

-- KEEP: chat_agents (used in AgentChat, ChatKnowYOU, text-to-speech, chat-router)

-- Health facilities and schools (unused in current app)
DROP TABLE IF EXISTS estabelecimentos_saude CASCADE;
DROP TABLE IF EXISTS escolas CASCADE;
DROP TABLE IF EXISTS saneamento_indicadores_municipio CASCADE;

-- Population data (unused)
DROP TABLE IF EXISTS pop_municipios CASCADE;
DROP TABLE IF EXISTS pop_estados CASCADE;

-- ============================================================
-- CLEAN UP ORPHANED TYPES
-- ============================================================
DROP TYPE IF EXISTS emotion_type CASCADE;
DROP TYPE IF EXISTS contour_type CASCADE;
DROP TYPE IF EXISTS audio_type CASCADE;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this after to see remaining tables:
/*
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
*/

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE 'Run the SELECT query above to verify remaining tables.';
  RAISE NOTICE '=========================================';
END $$;
