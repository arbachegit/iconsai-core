import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // GET - Retorna versão atual e histórico
    if (req.method === "GET") {
      const { data: currentVersion } = await supabase
        .from("version_control")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      const { data: history } = await supabase
        .from("version_control")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({
          current_version: currentVersion?.current_version || "0.0.0",
          history: history || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Incrementa versão
    if (req.method === "POST") {
      const { action, log_message, associated_data } = await req.json();

      if (!["patch", "minor", "major"].includes(action)) {
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be: patch, minor, or major" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar versão atual
      const { data: currentRecord } = await supabase
        .from("version_control")
        .select("current_version")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      const currentVersion = currentRecord?.current_version || "0.0.0";
      const [major, minor, patch] = currentVersion.split(".").map(Number);

      // Calcular nova versão
      let newVersion: string;
      let triggerType: string;

      switch (action) {
        case "patch":
          newVersion = `${major}.${minor}.${patch + 1}`;
          triggerType = "AUTO_PATCH";
          break;
        case "minor":
          newVersion = `${major}.${minor + 1}.0`;
          triggerType = "MANUAL_MINOR";
          break;
        case "major":
          newVersion = `${major + 1}.0.0`;
          triggerType = "MANUAL_MAJOR";
          break;
        default:
          newVersion = currentVersion;
          triggerType = "INITIAL";
      }

      console.log(`Version update: ${currentVersion} -> ${newVersion} (${triggerType})`);

      // Inserir novo registro
      const { data: newRecord, error: insertError } = await supabase
        .from("version_control")
        .insert({
          current_version: newVersion,
          log_message: log_message || `Atualização ${action} automática`,
          trigger_type: triggerType,
          associated_data: associated_data || {},
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting version:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          previous_version: currentVersion,
          new_version: newVersion,
          trigger_type: triggerType,
          record: newRecord,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in version-control:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
