import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableInfo {
  table_name: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  rls_enabled: boolean;
  policies: Array<{
    policy_name: string;
    command: string;
    permissive: string;
    using_expression: string | null;
    with_check_expression: string | null;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Starting documentation generation...');

    // 1. Extract Database Schema
    console.log('📊 Extracting database schema...');
    const { data: tables, error: tablesError } = await supabaseClient.rpc('execute', {
      query: `
        SELECT 
          t.table_name,
          json_agg(
            json_build_object(
              'column_name', c.column_name,
              'data_type', c.data_type,
              'is_nullable', c.is_nullable,
              'column_default', c.column_default
            ) ORDER BY c.ordinal_position
          ) as columns,
          EXISTS(
            SELECT 1 FROM pg_tables pt 
            WHERE pt.schemaname = 'public' 
            AND pt.tablename = t.table_name 
            AND pt.rowsecurity = true
          ) as rls_enabled
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c 
          ON t.table_name = c.table_name 
          AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name
        ORDER BY t.table_name;
      `
    });

    // Get RLS policies for each table
    const { data: policies } = await supabaseClient.rpc('execute', {
      query: `
        SELECT 
          tablename as table_name,
          policyname as policy_name,
          cmd as command,
          permissive,
          qual::text as using_expression,
          with_check::text as with_check_expression
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    });

    // Get database functions
    const { data: dbFunctions } = await supabaseClient.rpc('execute', {
      query: `
        SELECT 
          p.proname as function_name,
          pg_get_function_result(p.oid) as return_type,
          pg_get_function_arguments(p.oid) as arguments,
          d.description
        FROM pg_proc p
        LEFT JOIN pg_description d ON p.oid = d.objoid
        WHERE p.pronamespace = 'public'::regnamespace
        ORDER BY p.proname;
      `
    });

    // 2. Extract Edge Functions metadata
    console.log('⚡ Extracting edge functions...');
    const edgeFunctions = [
      'chat', 'chat-study', 'generate-image', 'generate-section-image',
      'text-to-speech', 'send-email', 'youtube-videos', 'analyze-sentiment',
      'sentiment-alert', 'generate-history-image', 'voice-to-text',
      'process-document-with-text', 'suggest-document-tags',
      'generate-document-summary', 'search-documents', 'process-bulk-document'
    ];

    const backendDocs = edgeFunctions.map(fn => ({
      name: fn,
      description: getEdgeFunctionDescription(fn),
      auth_required: ['text-to-speech', 'send-email'].includes(fn),
      file: `backend/${fn}.json`
    }));

    // 3. Generate Mermaid Diagram
    const mermaidDiagram = `graph TB
    subgraph Admin["🔐 Admin Panel"]
        BTN[Gerar Documentação]
        DOCS[DocumentsTab]
    end
    
    subgraph RAG["📚 RAG System"]
        PDF[PDF Upload]
        EXTRACT[Text Extraction]
        BULK[process-bulk-document]
        EMBED[OpenAI Embeddings]
        CHUNKS[(document_chunks)]
    end
    
    subgraph Chat["💬 Chat Systems"]
        STUDY[Study Assistant]
        HEALTH[Health Assistant]
        SEARCH[search-documents]
    end
    
    subgraph DB["🗄️ Database"]
        DOCS_TBL[(documents)]
        TAGS_TBL[(document_tags)]
        CONV[(conversation_history)]
    end
    
    BTN --> DOCS
    PDF --> EXTRACT
    EXTRACT --> BULK
    BULK --> EMBED
    EMBED --> CHUNKS
    BULK --> DOCS_TBL
    BULK --> TAGS_TBL
    STUDY --> SEARCH
    HEALTH --> SEARCH
    SEARCH --> CHUNKS
    STUDY --> CONV
    HEALTH --> CONV`;

    // 4. Create Documentation Structure
    const documentationIndex = {
      title: "KnowRisk Technical Documentation",
      version: `v${new Date().toISOString().split('T')[0]}`,
      generated_at: new Date().toISOString(),
      sections: [
        { id: "database", title: "🗄️ Database", description: "Schema, tables, policies, and functions" },
        { id: "backend", title: "⚡ Backend", description: "Edge Functions and serverless logic" },
        { id: "frontend", title: "🖥️ Frontend", description: "Components, hooks, and UI" }
      ],
      mermaid_diagram: mermaidDiagram
    };

    const databaseDoc = {
      title: "Database Schema",
      generated_at: new Date().toISOString(),
      tables: (tables || []).map((table: any) => ({
        name: table.table_name,
        columns: table.columns,
        rls_enabled: table.rls_enabled,
        policies: (policies || []).filter((p: any) => p.table_name === table.table_name)
      })),
      functions: dbFunctions || []
    };

    const backendDoc = {
      title: "Backend Edge Functions",
      generated_at: new Date().toISOString(),
      functions: backendDocs,
      total_functions: backendDocs.length
    };

    const frontendDoc = {
      title: "Frontend Components",
      generated_at: new Date().toISOString(),
      components: [
        { name: "ChatKnowYOU", category: "Chat", description: "Health assistant chat" },
        { name: "ChatStudy", category: "Chat", description: "Study assistant chat" },
        { name: "DocumentsTab", category: "Admin", description: "RAG documents management" },
        { name: "AIHistoryPanel", category: "Educational", description: "AI history timeline" }
      ]
    };

    // 5. Register version in database
    console.log('💾 Registering documentation version...');
    const version = `v${new Date().toISOString().split('T')[0]}`;
    const { error: versionError } = await supabaseClient
      .from('documentation_versions')
      .insert({
        version,
        author: 'Auto-generated',
        changes: [
          { type: 'database', count: (tables || []).length },
          { type: 'backend', count: backendDocs.length },
          { type: 'frontend', count: 4 }
        ]
      });

    if (versionError) {
      console.error('Error saving version:', versionError);
    }

    console.log('✅ Documentation generated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        version,
        generated_at: new Date().toISOString(),
        structure: {
          index: documentationIndex,
          database: databaseDoc,
          backend: backendDoc,
          frontend: frontendDoc
        },
        files_to_create: [
          'src/documentation/index.json',
          'src/documentation/database/schema.json',
          'src/documentation/backend/index.json',
          'src/documentation/frontend/components.json'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function getEdgeFunctionDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'chat': 'Health assistant chat with RAG integration',
    'chat-study': 'Study assistant for company knowledge',
    'generate-image': 'Image generation via Lovable AI',
    'generate-section-image': 'Section-specific image generation',
    'text-to-speech': 'ElevenLabs voice synthesis',
    'send-email': 'Resend email integration',
    'youtube-videos': 'YouTube API video fetching',
    'analyze-sentiment': 'Message sentiment analysis',
    'sentiment-alert': 'Sentiment threshold alerts',
    'generate-history-image': 'AI history timeline images',
    'voice-to-text': 'OpenAI Whisper transcription',
    'process-document-with-text': 'Document text processing',
    'suggest-document-tags': 'AI tag generation',
    'generate-document-summary': 'AI document summarization',
    'search-documents': 'RAG semantic search',
    'process-bulk-document': 'Bulk document processing with auto-categorization'
  };
  return descriptions[name] || 'No description available';
}
