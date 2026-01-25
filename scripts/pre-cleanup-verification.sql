-- ============================================================
-- SCRIPT DE VERIFICAÇÃO PRÉ-LIMPEZA
-- ============================================================
-- Execute ANTES do cleanup-unused-tables.sql
-- Este script mostra:
-- 1. Quais tabelas existem e serão deletadas
-- 2. Quantidade de registros em cada tabela
-- 3. Espaço ocupado
-- ============================================================

-- Função auxiliar para contar registros com segurança
CREATE OR REPLACE FUNCTION safe_count(table_name text)
RETURNS bigint AS $$
DECLARE
    result bigint;
BEGIN
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO result;
    RETURN result;
EXCEPTION
    WHEN undefined_table THEN
        RETURN -1;
    WHEN OTHERS THEN
        RETURN -2;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RELATÓRIO DE TABELAS A SEREM DELETADAS
-- ============================================================

SELECT
    'INDICADORES/APIs' as categoria,
    table_name as tabela,
    safe_count(table_name) as registros
FROM (VALUES
    ('indicator_values'),
    ('indicator_regional_values'),
    ('indicator_stats_summary'),
    ('pmc_valores_reais'),
    ('pac_valores_estimados'),
    ('pac_pmc_mapping'),
    ('economic_indicators'),
    ('brazilian_ufs'),
    ('system_api_registry'),
    ('api_test_staging'),
    ('api_audit_logs'),
    ('api_cache'),
    ('market_news'),
    ('regional_tone_rules')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'RAG/DOCUMENTOS' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('document_chunks'),
    ('document_tags'),
    ('document_versions'),
    ('document_routing_log'),
    ('document_onboarding_log'),
    ('documents'),
    ('documentation_versions'),
    ('documentation_sync_log'),
    ('rag_analytics')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'CHAT LEGADO' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('chat_messages'),
    ('chat_sessions'),
    ('chat_analytics'),
    ('chat_agents'),
    ('chat_config'),
    ('chat_routing_rules'),
    ('conversation_history')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'ML/TAXONOMIA' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('ml_tag_suggestions'),
    ('ml_tag_feedback'),
    ('ml_correlations'),
    ('ml_restrictions'),
    ('tag_management_events'),
    ('tag_merge_rules'),
    ('tag_modification_logs'),
    ('entity_tags'),
    ('ontology_relations'),
    ('ontology_concepts'),
    ('profile_taxonomies'),
    ('context_profiles'),
    ('global_taxonomy'),
    ('suggestion_audit')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'TREINAMENTO' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('maieutic_training_categories'),
    ('maieutic_effectiveness'),
    ('deterministic_analysis'),
    ('lexicon_terms')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'SEGURANCA' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('security_shield_config'),
    ('security_scan_results'),
    ('security_alert_config'),
    ('security_severity_history')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'NOTIFICACOES' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('notification_templates'),
    ('notification_logs'),
    ('notification_preferences'),
    ('notification_fallback_config'),
    ('notification_fallback_logs'),
    ('notification_logic_config'),
    ('whatsapp_tier_status'),
    ('whatsapp_daily_metrics'),
    ('whatsapp_quality_events')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'CONTEUDO/MIDIA' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('section_content_versions'),
    ('section_contents'),
    ('audio_contents'),
    ('podcast_contents'),
    ('tooltip_contents'),
    ('vimeo_videos'),
    ('generated_images'),
    ('section_audio')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'CRM/CONTATO' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('crm_visits'),
    ('contact_messages'),
    ('reply_templates'),
    ('admin_notifications')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'USUARIOS/ATIVIDADE' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('user_invitations'),
    ('user_registrations'),
    ('user_activity_logs'),
    ('activity_logs'),
    ('invitation_channel_audit'),
    ('user_preferences')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

UNION ALL

SELECT
    'SCHEMA/CONFIG' as categoria,
    table_name,
    safe_count(table_name)
FROM (VALUES
    ('schema_audit_log'),
    ('app_config')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)

ORDER BY categoria, tabela;

-- ============================================================
-- RESUMO POR CATEGORIA
-- ============================================================

SELECT
    '=== RESUMO ===' as info,
    NULL::text as detalhe,
    NULL::bigint as valor;

-- ============================================================
-- TABELAS PWA QUE DEVEM PERMANECER
-- ============================================================

SELECT
    'TABELAS PWA (MANTER)' as categoria,
    table_name as tabela,
    safe_count(table_name) as registros
FROM (VALUES
    ('pwa_config'),
    ('pwa_sessions'),
    ('pwa_messages'),
    ('pwa_invites'),
    ('pwa_users'),
    ('pwa_devices'),
    ('pwa_device_fingerprints'),
    ('pwa_conversation_sessions'),
    ('pwa_conversation_messages'),
    ('pwa_conv_summaries'),
    ('pwacity_config'),
    ('pwacity_conversations'),
    ('pwahealth_config'),
    ('security_whitelist'),
    ('security_audit_log'),
    ('banned_devices'),
    ('user_roles'),
    ('admin_settings'),
    ('profiles')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
)
ORDER BY tabela;

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS safe_count(text);
