-- ============================================================
-- SCRIPT DE LIMPEZA: Remoção de Tabelas Não Utilizadas
-- ============================================================
-- Data: 2026-01-24
-- Projeto: IconsAI Core - Isolamento do PWA
--
-- IMPORTANTE: Execute este script com cautela!
-- Recomenda-se fazer backup antes de executar.
--
-- Este script remove tabelas que:
-- 1. Serão substituídas pelo brasil-data-hub (indicadores)
-- 2. São usadas apenas pelo Admin (não pelo PWA)
-- 3. São legadas e não funcionam mais
-- ============================================================

-- Desabilitar verificação de foreign keys temporariamente
SET session_replication_role = 'replica';

-- ============================================================
-- SEÇÃO 1: INDICADORES ECONÔMICOS E APIs
-- (Serão substituídos pelo brasil-data-hub)
-- ============================================================

-- Tabelas de valores de indicadores (dependem de economic_indicators)
DROP TABLE IF EXISTS indicator_values CASCADE;
DROP TABLE IF EXISTS indicator_regional_values CASCADE;
DROP TABLE IF EXISTS indicator_stats_summary CASCADE;

-- Tabelas de PMC/PAC
DROP TABLE IF EXISTS pmc_valores_reais CASCADE;
DROP TABLE IF EXISTS pac_valores_estimados CASCADE;
DROP TABLE IF EXISTS pac_pmc_mapping CASCADE;

-- Tabela principal de indicadores
DROP TABLE IF EXISTS economic_indicators CASCADE;

-- Estados brasileiros (brasil-data-hub terá geo_estados)
DROP TABLE IF EXISTS brazilian_ufs CASCADE;

-- Registro e auditoria de APIs
DROP TABLE IF EXISTS system_api_registry CASCADE;
DROP TABLE IF EXISTS api_test_staging CASCADE;
DROP TABLE IF EXISTS api_audit_logs CASCADE;
DROP TABLE IF EXISTS api_cache CASCADE;

-- Notícias de mercado
DROP TABLE IF EXISTS market_news CASCADE;

-- Regras regionais de tom
DROP TABLE IF EXISTS regional_tone_rules CASCADE;

-- ============================================================
-- SEÇÃO 2: RAG / DOCUMENTOS
-- (Usado apenas pelo Admin, não pelo PWA)
-- ============================================================

-- Tabelas dependentes primeiro
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_routing_log CASCADE;
DROP TABLE IF EXISTS document_onboarding_log CASCADE;

-- Tabela principal de documentos
DROP TABLE IF EXISTS documents CASCADE;

-- Documentação e sync
DROP TABLE IF EXISTS documentation_versions CASCADE;
DROP TABLE IF EXISTS documentation_sync_log CASCADE;

-- Analytics RAG
DROP TABLE IF EXISTS rag_analytics CASCADE;

-- ============================================================
-- SEÇÃO 3: CHAT LEGADO / AGENTES
-- (Sistema antigo, substituído pelo PWA Voice)
-- ============================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS chat_analytics CASCADE;
DROP TABLE IF EXISTS chat_agents CASCADE;
DROP TABLE IF EXISTS chat_config CASCADE;
DROP TABLE IF EXISTS chat_routing_rules CASCADE;
DROP TABLE IF EXISTS conversation_history CASCADE;

-- ============================================================
-- SEÇÃO 4: ML / TAXONOMIA
-- (Usado apenas pelo Admin)
-- ============================================================

-- Machine Learning
DROP TABLE IF EXISTS ml_tag_suggestions CASCADE;
DROP TABLE IF EXISTS ml_tag_feedback CASCADE;
DROP TABLE IF EXISTS ml_correlations CASCADE;
DROP TABLE IF EXISTS ml_restrictions CASCADE;

-- Gestão de Tags
DROP TABLE IF EXISTS tag_management_events CASCADE;
DROP TABLE IF EXISTS tag_merge_rules CASCADE;
DROP TABLE IF EXISTS tag_modification_logs CASCADE;

-- Taxonomia e Ontologia
DROP TABLE IF EXISTS entity_tags CASCADE;
DROP TABLE IF EXISTS ontology_relations CASCADE;
DROP TABLE IF EXISTS ontology_concepts CASCADE;
DROP TABLE IF EXISTS profile_taxonomies CASCADE;
DROP TABLE IF EXISTS context_profiles CASCADE;
DROP TABLE IF EXISTS global_taxonomy CASCADE;

-- Auditoria de sugestões
DROP TABLE IF EXISTS suggestion_audit CASCADE;

-- ============================================================
-- SEÇÃO 5: TREINAMENTO / ANÁLISE
-- (Usado apenas pelo Admin)
-- ============================================================

DROP TABLE IF EXISTS maieutic_training_categories CASCADE;
DROP TABLE IF EXISTS maieutic_effectiveness CASCADE;
DROP TABLE IF EXISTS deterministic_analysis CASCADE;
DROP TABLE IF EXISTS lexicon_terms CASCADE;

-- ============================================================
-- SEÇÃO 6: SEGURANÇA (Tabelas não funcionais)
-- ============================================================

-- Shield config não funciona (erro 406)
DROP TABLE IF EXISTS security_shield_config CASCADE;

-- Scan results (opcional - avaliar necessidade)
DROP TABLE IF EXISTS security_scan_results CASCADE;

-- Configurações de alerta de segurança
DROP TABLE IF EXISTS security_alert_config CASCADE;
DROP TABLE IF EXISTS security_severity_history CASCADE;

-- ============================================================
-- SEÇÃO 7: NOTIFICAÇÕES / WHATSAPP
-- (Usado apenas pelo Admin)
-- ============================================================

-- Notificações
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_fallback_config CASCADE;
DROP TABLE IF EXISTS notification_fallback_logs CASCADE;
DROP TABLE IF EXISTS notification_logic_config CASCADE;

-- WhatsApp
DROP TABLE IF EXISTS whatsapp_tier_status CASCADE;
DROP TABLE IF EXISTS whatsapp_daily_metrics CASCADE;
DROP TABLE IF EXISTS whatsapp_quality_events CASCADE;

-- ============================================================
-- SEÇÃO 8: CONTEÚDO / MÍDIA
-- (Usado apenas pelo Admin)
-- ============================================================

DROP TABLE IF EXISTS section_content_versions CASCADE;
DROP TABLE IF EXISTS section_contents CASCADE;
DROP TABLE IF EXISTS audio_contents CASCADE;
DROP TABLE IF EXISTS podcast_contents CASCADE;
DROP TABLE IF EXISTS tooltip_contents CASCADE;
DROP TABLE IF EXISTS vimeo_videos CASCADE;
DROP TABLE IF EXISTS generated_images CASCADE;

-- ============================================================
-- SEÇÃO 9: CRM / CONTATO
-- (Usado apenas pelo Admin)
-- ============================================================

DROP TABLE IF EXISTS crm_visits CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS reply_templates CASCADE;
DROP TABLE IF EXISTS admin_notifications CASCADE;

-- ============================================================
-- SEÇÃO 10: USUÁRIOS / ATIVIDADE (Legado)
-- ============================================================

DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS user_registrations CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS invitation_channel_audit CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- ============================================================
-- SEÇÃO 11: SCHEMA / CONFIG (Legado)
-- ============================================================

DROP TABLE IF EXISTS schema_audit_log CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- ============================================================
-- SEÇÃO 12: SECTION AUDIO (Erro de UUID)
-- ============================================================

DROP TABLE IF EXISTS section_audio CASCADE;

-- Reabilitar verificação de foreign keys
SET session_replication_role = 'origin';

-- ============================================================
-- VERIFICAÇÃO: Listar tabelas restantes
-- ============================================================

-- Execute esta query para ver as tabelas que permaneceram:
/*
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
*/

-- ============================================================
-- TABELAS QUE DEVEM PERMANECER (PWA):
-- ============================================================
-- pwa_config
-- pwa_sessions
-- pwa_messages
-- pwa_invites
-- pwa_users
-- pwa_devices
-- pwa_device_fingerprints
-- pwa_conversation_sessions
-- pwa_conversation_messages
-- pwa_conv_summaries
-- pwacity_config
-- pwacity_conversations
-- pwahealth_config
-- security_whitelist
-- security_audit_log
-- banned_devices
-- user_roles
-- admin_settings
-- profiles
-- ============================================================
