# Instruções para Executar Limpeza no Supabase

## Projeto: iconsai-core (eefoiubkvyykalsbcoci)

### Passo 1: Acessar o SQL Editor

1. Acesse: https://supabase.com/dashboard/project/eefoiubkvyykalsbcoci/sql/new
2. Faça login se necessário

### Passo 2: Executar o Script de Limpeza

Copie e cole o seguinte SQL no editor:

```sql
-- ============================================================
-- CLEANUP: Remoção de Tabelas Não Utilizadas
-- Total a liberar: ~60 MB
-- ============================================================

-- SEÇÃO 1: INDICADORES (brasil-data-hub substitui) - ~59 MB
DROP TABLE IF EXISTS municipal_indicators CASCADE;
DROP TABLE IF EXISTS indicator_values CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS indicator_regional_values CASCADE;
DROP TABLE IF EXISTS estados CASCADE;
DROP TABLE IF EXISTS economic_indicators CASCADE;
DROP TABLE IF EXISTS indicator_stats_summary CASCADE;
DROP TABLE IF EXISTS brazilian_ufs CASCADE;
DROP TABLE IF EXISTS pmc_valores_reais CASCADE;
DROP TABLE IF EXISTS pac_valores_estimados CASCADE;
DROP TABLE IF EXISTS pac_pmc_mapping CASCADE;
DROP TABLE IF EXISTS indices_history CASCADE;
DROP TABLE IF EXISTS municipal_indices CASCADE;
DROP TABLE IF EXISTS municipalities CASCADE;

-- SEÇÃO 2: SISTEMA DE APIs
DROP TABLE IF EXISTS system_api_registry CASCADE;
DROP TABLE IF EXISTS api_test_staging CASCADE;
DROP TABLE IF EXISTS api_audit_logs CASCADE;
DROP TABLE IF EXISTS api_cache CASCADE;
DROP TABLE IF EXISTS market_news CASCADE;

-- SEÇÃO 3: RAG/DOCUMENTOS
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

-- SEÇÃO 4: CHAT LEGADO
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS chat_analytics CASCADE;
DROP TABLE IF EXISTS chat_config CASCADE;
DROP TABLE IF EXISTS chat_routing_rules CASCADE;
DROP TABLE IF EXISTS conversation_history CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS user_chat_preferences CASCADE;
DROP TABLE IF EXISTS chat_agents CASCADE;

-- SEÇÃO 5: ML/TAXONOMIA
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
DROP TABLE IF EXISTS global_taxonomy CASCADE;
DROP TABLE IF EXISTS context_profiles CASCADE;
DROP TABLE IF EXISTS context_detection_rules CASCADE;

-- SEÇÃO 6: TREINAMENTO/ANÁLISE
DROP TABLE IF EXISTS maieutic_training_categories CASCADE;
DROP TABLE IF EXISTS maieutic_metrics CASCADE;
DROP TABLE IF EXISTS deterministic_analysis CASCADE;
DROP TABLE IF EXISTS lexicon_terms CASCADE;
DROP TABLE IF EXISTS regional_tone_rules CASCADE;
DROP TABLE IF EXISTS phonetic_rules CASCADE;
DROP TABLE IF EXISTS regional_pronunciations CASCADE;
DROP TABLE IF EXISTS agent_pronunciations CASCADE;
DROP TABLE IF EXISTS agent_phrases CASCADE;

-- SEÇÃO 7: SEGURANÇA (não funcionais)
DROP TABLE IF EXISTS security_shield_config CASCADE;
DROP TABLE IF EXISTS security_scan_results CASCADE;
DROP TABLE IF EXISTS security_alert_config CASCADE;
DROP TABLE IF EXISTS security_severity_history CASCADE;
DROP TABLE IF EXISTS integrity_check_log CASCADE;

-- SEÇÃO 8: NOTIFICAÇÕES
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_fallback_config CASCADE;
DROP TABLE IF EXISTS notification_fallback_logs CASCADE;
DROP TABLE IF EXISTS notification_logic_config CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;

-- SEÇÃO 9: WHATSAPP
DROP TABLE IF EXISTS whatsapp_tier_status CASCADE;
DROP TABLE IF EXISTS whatsapp_daily_metrics CASCADE;
DROP TABLE IF EXISTS whatsapp_quality_events CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_conversations CASCADE;

-- SEÇÃO 10: CONTEÚDO/MÍDIA
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
DROP TABLE IF EXISTS audio_contents CASCADE;

-- SEÇÃO 11: CRM/CONTATO
DROP TABLE IF EXISTS crm_visits CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS reply_templates CASCADE;
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;

-- SEÇÃO 12: USUÁRIOS LEGADO
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_profiles_extended CASCADE;
DROP TABLE IF EXISTS communication_styles CASCADE;
DROP TABLE IF EXISTS credits_usage CASCADE;
DROP TABLE IF EXISTS typing_latency_logs CASCADE;
DROP TABLE IF EXISTS debug_logs CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS user_registrations CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS sms_verification_codes CASCADE;
DROP TABLE IF EXISTS password_recovery_codes CASCADE;
DROP TABLE IF EXISTS phone_verifications CASCADE;

-- SEÇÃO 13: SCHEMA/CONFIG
DROP TABLE IF EXISTS schema_audit_log CASCADE;
DROP TABLE IF EXISTS system_versions CASCADE;

-- Verificar tabelas restantes
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Passo 3: Clicar em "Run" (ou Ctrl+Enter)

### Tabelas que Devem Permanecer

Após a execução, você deve ver apenas estas tabelas:

- `admin_settings`
- `app_config`
- `banned_devices`
- `feature_flags`
- `profiles`
- `pwa_config`
- `pwa_conversation_messages`
- `pwa_conversation_sessions`
- `pwa_conversation_summaries`
- `pwa_device_fingerprints`
- `pwa_invites`
- `pwa_sessions`
- `pwa_user_devices`
- `pwacity_config`
- `security_audit_log`
- `security_violations`
- `security_whitelist`
- `speech_humanization`
- `user_roles`

### Espaço Liberado

- **~60 MB** de dados
- **~100+ tabelas** removidas
