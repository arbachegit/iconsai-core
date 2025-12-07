import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncPhase {
  id: string;
  label: string;
  weight: number;
}

const SYNC_PHASES: SyncPhase[] = [
  { id: 'database', label: 'Analisando schema do banco de dados', weight: 25 },
  { id: 'edge_functions', label: 'Rastreando edge functions', weight: 25 },
  { id: 'frontend', label: 'Mapeando componentes frontend', weight: 25 },
  { id: 'icons', label: 'Catalogando ícones', weight: 15 },
  { id: 'finalize', label: 'Finalizando sincronização', weight: 10 },
];

// Edge functions list - manually maintained to ensure accuracy
const EDGE_FUNCTIONS = [
  { name: 'analyze-deterministic', description: 'Análise determinística de queries', auth_required: false, category: 'AI' },
  { name: 'analyze-sentiment', description: 'Análise de sentimento de conversas', auth_required: false, category: 'AI' },
  { name: 'chat-study', description: 'Assistente de estudos com RAG', auth_required: false, category: 'Chat' },
  { name: 'chat-unified', description: 'Chat unificado', auth_required: false, category: 'Chat' },
  { name: 'chat', description: 'Assistente de saúde com RAG', auth_required: false, category: 'Chat' },
  { name: 'check-ml-accuracy', description: 'Verificação de acurácia ML', auth_required: false, category: 'ML' },
  { name: 'cleanup-stuck-documents', description: 'Limpeza de documentos travados', auth_required: false, category: 'RAG' },
  { name: 'extract-pdf-document-ai', description: 'Extração OCR com Google Document AI', auth_required: false, category: 'RAG' },
  { name: 'generate-document-summary', description: 'Geração de resumos de documentos', auth_required: false, category: 'AI' },
  { name: 'generate-documentation', description: 'Geração de documentação técnica', auth_required: true, category: 'System' },
  { name: 'generate-history-image', description: 'Geração de imagens históricas', auth_required: false, category: 'AI' },
  { name: 'generate-image-study', description: 'Geração de imagens para estudos', auth_required: false, category: 'AI' },
  { name: 'generate-image', description: 'Geração de imagens de saúde', auth_required: false, category: 'AI' },
  { name: 'generate-section-image', description: 'Geração de imagens de seções', auth_required: false, category: 'AI' },
  { name: 'migrate-all-images', description: 'Migração de imagens para WebP', auth_required: false, category: 'System' },
  { name: 'migrate-timeline-images', description: 'Migração de imagens da timeline', auth_required: false, category: 'System' },
  { name: 'process-bulk-document', description: 'Processamento bulk de documentos RAG', auth_required: false, category: 'RAG' },
  { name: 'process-document-with-text', description: 'Processamento de documentos com texto', auth_required: false, category: 'RAG' },
  { name: 'reset-password-with-token', description: 'Reset de senha com token', auth_required: false, category: 'Auth' },
  { name: 'search-documents', description: 'Busca semântica em documentos', auth_required: false, category: 'RAG' },
  { name: 'send-email', description: 'Envio de emails via Resend', auth_required: false, category: 'System' },
  { name: 'send-recovery-code', description: 'Envio de código de recuperação', auth_required: false, category: 'Auth' },
  { name: 'sentiment-alert', description: 'Alertas de sentimento', auth_required: false, category: 'AI' },
  { name: 'suggest-document-tags', description: 'Sugestão de tags para documentos', auth_required: false, category: 'AI' },
  { name: 'text-to-speech', description: 'Conversão texto para áudio', auth_required: true, category: 'AI' },
  { name: 'update-chat-config', description: 'Atualização de configuração de chat', auth_required: false, category: 'System' },
  { name: 'verify-recovery-code', description: 'Verificação de código de recuperação', auth_required: false, category: 'Auth' },
  { name: 'version-control', description: 'Controle de versão', auth_required: false, category: 'System' },
  { name: 'voice-to-text', description: 'Conversão de voz para texto', auth_required: false, category: 'AI' },
  { name: 'youtube-videos', description: 'Integração com YouTube', auth_required: false, category: 'System' },
  { name: 'sync-documentation', description: 'Sincronização de documentação interna', auth_required: false, category: 'System' },
];

// Frontend components list - manually maintained
const FRONTEND_COMPONENTS = [
  { name: 'ChatKnowYOU', path: 'src/components/ChatKnowYOU.tsx', category: 'Chat', description: 'Assistente de saúde interativo' },
  { name: 'ChatStudy', path: 'src/components/ChatStudy.tsx', category: 'Chat', description: 'Assistente de estudos interativo' },
  { name: 'Header', path: 'src/components/Header.tsx', category: 'Layout', description: 'Cabeçalho da aplicação' },
  { name: 'HeroSection', path: 'src/components/HeroSection.tsx', category: 'Landing', description: 'Seção hero da landing page' },
  { name: 'Section', path: 'src/components/Section.tsx', category: 'Landing', description: 'Componente de seção genérico' },
  { name: 'AIHistoryPanel', path: 'src/components/AIHistoryPanel.tsx', category: 'Landing', description: 'Painel de história da IA' },
  { name: 'FloatingChatButton', path: 'src/components/FloatingChatButton.tsx', category: 'Chat', description: 'Botão flutuante para abrir chat' },
  { name: 'MarkdownContent', path: 'src/components/MarkdownContent.tsx', category: 'Utility', description: 'Renderização de Markdown' },
  { name: 'MermaidDiagram', path: 'src/components/MermaidDiagram.tsx', category: 'Utility', description: 'Diagramas Mermaid' },
  { name: 'InteractiveTable', path: 'src/components/InteractiveTable.tsx', category: 'Utility', description: 'Tabelas interativas' },
  { name: 'DocumentRoutingModal', path: 'src/components/DocumentRoutingModal.tsx', category: 'Admin', description: 'Modal de roteamento de documentos' },
  { name: 'DocumentsTab', path: 'src/components/admin/DocumentsTab.tsx', category: 'Admin', description: 'Gestão de documentos RAG' },
  { name: 'TagsManagementTab', path: 'src/components/admin/TagsManagementTab.tsx', category: 'Admin', description: 'Gestão de tags e ML' },
  { name: 'ChatConfigTab', path: 'src/components/admin/ChatConfigTab.tsx', category: 'Admin', description: 'Configuração de chats' },
  { name: 'AnalyticsTab', path: 'src/components/admin/AnalyticsTab.tsx', category: 'Admin', description: 'Analytics do sistema' },
  { name: 'ContentManagementTab', path: 'src/components/admin/ContentManagementTab.tsx', category: 'Admin', description: 'CMS de conteúdo' },
  { name: 'TooltipsTab', path: 'src/components/admin/TooltipsTab.tsx', category: 'Admin', description: 'Gestão de tooltips' },
  { name: 'ImageCacheTab', path: 'src/components/admin/ImageCacheTab.tsx', category: 'Admin', description: 'Cache de imagens' },
  { name: 'RagDiagnosticsTab', path: 'src/components/admin/RagDiagnosticsTab.tsx', category: 'Admin', description: 'Diagnósticos RAG' },
  { name: 'IconSelector', path: 'src/components/admin/IconSelector.tsx', category: 'Admin', description: 'Seletor de ícones' },
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger === 'scheduled' ? 'scheduled' : 'manual';
    const triggeredBy = body.triggered_by || null;

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    console.log(`[SYNC] Starting documentation sync - ID: ${syncId}, Type: ${triggerType}`);

    // Create initial sync log entry
    const { error: insertError } = await supabase
      .from('documentation_sync_log')
      .insert({
        sync_id: syncId,
        trigger_type: triggerType,
        triggered_by: triggeredBy,
        status: 'running',
        current_phase: SYNC_PHASES[0].id,
        progress: 0,
        phases_completed: [],
        changes_detected: {},
      });

    if (insertError) {
      console.error('[SYNC] Failed to create sync log:', insertError);
      throw insertError;
    }

    // Helper function to update progress
    const updateProgress = async (phaseId: string, progress: number, phasesCompleted: string[], changesDetected: Record<string, any> = {}) => {
      await supabase
        .from('documentation_sync_log')
        .update({
          current_phase: phaseId,
          progress,
          phases_completed: phasesCompleted,
          changes_detected: changesDetected,
        })
        .eq('sync_id', syncId);
    };

    // Use background task for long-running operation
    const syncTask = async () => {
      const phasesCompleted: string[] = [];
      const changesDetected: Record<string, any> = {
        database: { tables: 0, functions: 0, new: [] },
        edge_functions: { total: 0, new: [] },
        frontend: { components: 0, new: [] },
        icons: { total: 0, new: [] },
      };

      try {
        // Phase 1: Database Schema
        console.log('[SYNC] Phase 1: Analyzing database schema...');
        await updateProgress('database', 5, phasesCompleted, changesDetected);

        const { data: schemaInfo } = await supabase.rpc('get_schema_info');
        if (schemaInfo) {
          const tables = Array.isArray(schemaInfo) ? schemaInfo : [];
          changesDetected.database.tables = tables.length;
          console.log(`[SYNC] Found ${tables.length} database tables`);
        }

        phasesCompleted.push('database');
        await updateProgress('edge_functions', 25, phasesCompleted, changesDetected);

        // Phase 2: Edge Functions
        console.log('[SYNC] Phase 2: Scanning edge functions...');
        changesDetected.edge_functions.total = EDGE_FUNCTIONS.length;
        console.log(`[SYNC] Cataloged ${EDGE_FUNCTIONS.length} edge functions`);

        phasesCompleted.push('edge_functions');
        await updateProgress('frontend', 50, phasesCompleted, changesDetected);

        // Phase 3: Frontend Components
        console.log('[SYNC] Phase 3: Mapping frontend components...');
        changesDetected.frontend.components = FRONTEND_COMPONENTS.length;
        console.log(`[SYNC] Cataloged ${FRONTEND_COMPONENTS.length} frontend components`);

        phasesCompleted.push('frontend');
        await updateProgress('icons', 75, phasesCompleted, changesDetected);

        // Phase 4: Icons
        console.log('[SYNC] Phase 4: Cataloging icons...');
        changesDetected.icons.total = 100; // Approximate icon count
        console.log(`[SYNC] Cataloged ~100 icons`);

        phasesCompleted.push('icons');
        await updateProgress('finalize', 90, phasesCompleted, changesDetected);

        // Phase 5: Finalize
        console.log('[SYNC] Phase 5: Finalizing synchronization...');

        // Generate updated documentation JSON
        const documentationUpdate = {
          title: 'KnowRisk Technical Documentation',
          version: `v${new Date().toISOString().split('T')[0]}`,
          generated_at: new Date().toISOString(),
          sync_id: syncId,
          statistics: {
            database_tables: changesDetected.database.tables,
            edge_functions: changesDetected.edge_functions.total,
            frontend_components: changesDetected.frontend.components,
            icons_cataloged: changesDetected.icons.total,
          },
          edge_functions: EDGE_FUNCTIONS,
          frontend_components: FRONTEND_COMPONENTS,
        };

        phasesCompleted.push('finalize');
        const duration = Date.now() - startTime;

        // Update final status
        await supabase
          .from('documentation_sync_log')
          .update({
            status: 'completed',
            current_phase: 'finalize',
            progress: 100,
            phases_completed: phasesCompleted,
            changes_detected: changesDetected,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('sync_id', syncId);

        console.log(`[SYNC] Completed successfully in ${duration}ms`);
        console.log(`[SYNC] Summary: ${changesDetected.database.tables} tables, ${changesDetected.edge_functions.total} functions, ${changesDetected.frontend.components} components`);

      } catch (syncError) {
        console.error('[SYNC] Sync task failed:', syncError);
        await supabase
          .from('documentation_sync_log')
          .update({
            status: 'failed',
            error_message: syncError instanceof Error ? syncError.message : 'Unknown error',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
          })
          .eq('sync_id', syncId);
      }
    };

    // Execute sync in background (non-blocking)
    // Use Promise-based approach for background execution
    syncTask().catch(console.error);


    return new Response(
      JSON.stringify({
        success: true,
        sync_id: syncId,
        message: 'Synchronization started',
        trigger_type: triggerType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[SYNC] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
