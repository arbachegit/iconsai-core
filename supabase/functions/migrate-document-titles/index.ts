import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types for rename reasons
type OriginalTitleProblem = 
  | 'numeric' 
  | 'hash' 
  | 'uuid' 
  | 'unreadable' 
  | 'technical' 
  | 'mixed_pattern';

/**
 * Detects WHY a filename needs to be renamed
 */
function detectRenameReason(filename: string): OriginalTitleProblem | null {
  const cleanTitle = filename.replace(/\.(pdf|docx?|txt|xlsx?|pptx?|csv|rtf|odt)$/i, '').trim();
  
  if (cleanTitle.length === 0) return 'unreadable';
  
  // 1. Check for UUID pattern
  if (/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(cleanTitle)) {
    return 'uuid';
  }
  
  // 2. Check for hash pattern (16+ hex chars)
  if (/^[a-f0-9]{16,}$/i.test(cleanTitle.replace(/[^a-z0-9]/gi, ''))) {
    return 'hash';
  }
  
  // 3. Check numeric ratio
  const numericRatio = (cleanTitle.match(/\d/g) || []).length / cleanTitle.length;
  if (numericRatio > 0.5) {
    return 'numeric';
  }
  
  // 4. Check for technical patterns
  const technicalPattern = /^(doc|file|scan|img|pdf|download|document|arquivo|upload|temp|tmp|copy|copia)[-_]?[a-z0-9]+$/i;
  if (technicalPattern.test(cleanTitle)) {
    return 'technical';
  }
  
  // 5. Check for mixed pattern without meaning
  const mixedPattern = /^[a-z0-9]{1,3}[-_][a-z0-9]+[-_][a-z0-9]+$/i;
  if (mixedPattern.test(cleanTitle)) {
    return 'mixed_pattern';
  }
  
  // 6. Check readable characters
  const readableChars = cleanTitle.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  if (readableChars.length < 3) {
    return 'unreadable';
  }
  
  return null; // Title is fine
}

/**
 * Checks if a filename needs renaming
 */
function needsRenaming(filename: string): boolean {
  return detectRenameReason(filename) !== null;
}

/**
 * Generates a title using the Lovable AI Gateway
 */
async function generateTitleWithAI(textSample: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return '';
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em criar títulos concisos e descritivos para documentos.
Sua tarefa é gerar um título claro e informativo baseado no conteúdo do documento.

Regras:
- Máximo 80 caracteres
- Seja descritivo mas conciso
- Use português brasileiro
- Não use aspas ou caracteres especiais
- Comece com letra maiúscula
- Capture a essência principal do documento`
          },
          {
            role: "user",
            content: `Gere um título curto e descritivo para este documento:\n\n${textSample.slice(0, 1500)}`
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return '';
    }

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean up the title
    return title
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^título:\s*/i, '') // Remove "Título:" prefix
      .substring(0, 80);
  } catch (error) {
    console.error("Error calling AI Gateway:", error);
    return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🚀 Starting document title migration...");

    // Fetch documents that haven't been processed (original_title IS NULL)
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, filename, ai_summary, original_text, text_preview')
      .is('original_title', null)
      .eq('status', 'completed');

    if (fetchError) {
      console.error("Error fetching documents:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${documents?.length || 0} documents to process`);

    const results = {
      processed: 0,
      renamed: 0,
      kept: 0,
      errors: [] as string[]
    };

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum documento pendente de migração",
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const doc of documents) {
      try {
        console.log(`\n📄 Processing: ${doc.filename}`);
        
        const renameReason = detectRenameReason(doc.filename);
        
        if (renameReason) {
          console.log(`  ⚠️ Needs renaming (reason: ${renameReason})`);
          
          // Generate new title using AI
          // Priority: ai_summary > text_preview > original_text > filename
          const textSource = doc.ai_summary || doc.text_preview || doc.original_text?.slice(0, 2000) || doc.filename;
          const newTitle = await generateTitleWithAI(textSource);
          
          if (newTitle && newTitle.length > 5) {
            // Update document with new title
            const { error: updateError } = await supabase
              .from('documents')
              .update({
                original_title: doc.filename,
                ai_title: newTitle,
                title_was_renamed: true,
                renamed_at: new Date().toISOString(),
                rename_reason: renameReason,
                title_source: 'ai',
                needs_title_review: false
              })
              .eq('id', doc.id);

            if (updateError) {
              console.error(`  ❌ Error updating document:`, updateError);
              results.errors.push(`${doc.filename}: ${updateError.message}`);
            } else {
              console.log(`  ✅ Renamed: "${doc.filename}" → "${newTitle}"`);
              results.renamed++;
            }
          } else {
            // AI failed to generate title, just mark original_title
            const { error: updateError } = await supabase
              .from('documents')
              .update({
                original_title: doc.filename,
                title_was_renamed: false,
                title_source: 'filename'
              })
              .eq('id', doc.id);

            if (updateError) {
              results.errors.push(`${doc.filename}: ${updateError.message}`);
            } else {
              console.log(`  ⚠️ AI failed, kept original`);
              results.kept++;
            }
          }
        } else {
          // Title is already readable, just mark original_title
          console.log(`  ✅ Title is already readable`);
          
          const { error: updateError } = await supabase
            .from('documents')
            .update({
              original_title: doc.filename,
              title_was_renamed: false,
              title_source: 'filename'
            })
            .eq('id', doc.id);

          if (updateError) {
            results.errors.push(`${doc.filename}: ${updateError.message}`);
          } else {
            results.kept++;
          }
        }
        
        results.processed++;
        
        // Delay to avoid rate limiting (500ms between updates)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (docError: any) {
        console.error(`  ❌ Error processing ${doc.filename}:`, docError);
        results.errors.push(`${doc.filename}: ${docError.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION COMPLETED');
    console.log(`   📊 Total processed: ${results.processed}`);
    console.log(`   🔄 Renamed: ${results.renamed}`);
    console.log(`   ⏭️ Kept: ${results.kept}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(50));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migração concluída: ${results.renamed} renomeados, ${results.kept} mantidos`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
