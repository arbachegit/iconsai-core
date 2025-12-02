import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 [process-pending-batch] Starting automatic batch processing...");

    // Fetch pending documents
    const { data: pendingDocs, error: fetchError } = await supabase
      .from("documents")
      .select("id, filename, original_text, target_chat")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("❌ Error fetching pending documents:", fetchError);
      throw fetchError;
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      console.log("✅ No pending documents to process");
      return new Response(
        JSON.stringify({ success: true, message: "No pending documents", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${pendingDocs.length} pending documents to process`);

    // Process documents in parallel
    const results = await Promise.allSettled(
      pendingDocs.map(async (doc) => {
        console.log(`🔄 Processing: ${doc.filename} (${doc.id})`);
        
        // Mark as processing
        await supabase
          .from("documents")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", doc.id);

        // Call process-document-with-text
        const { error: processError } = await supabase.functions.invoke("process-document-with-text", {
          body: {
            documentId: doc.id,
            text: doc.original_text,
            filename: doc.filename,
            targetChat: doc.target_chat,
          },
        });

        if (processError) {
          console.error(`❌ Error processing ${doc.filename}:`, processError);
          throw processError;
        }

        console.log(`✅ Successfully queued: ${doc.filename}`);
        return { id: doc.id, filename: doc.filename, success: true };
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`📊 Batch complete: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingDocs.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          id: pendingDocs[i].id,
          filename: pendingDocs[i].filename,
          status: r.status,
          error: r.status === "rejected" ? String((r as PromiseRejectedResult).reason) : null,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ [process-pending-batch] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
