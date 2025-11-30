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

    // POST - Incrementa versão, Rollback ou Exporta Changelog
    if (req.method === "POST") {
      const { action, log_message, associated_data, target_version_id, format } = await req.json();

      // Rollback to specific version
      if (action === "rollback") {
        if (!target_version_id) {
          return new Response(
            JSON.stringify({ error: "target_version_id required for rollback" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch target version
        const { data: targetVersion, error: fetchError } = await supabase
          .from("version_control")
          .select("*")
          .eq("id", target_version_id)
          .single();

        if (fetchError || !targetVersion) {
          return new Response(
            JSON.stringify({ error: "Target version not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current version for comparison
        const { data: currentRecord } = await supabase
          .from("version_control")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(1)
          .single();

        const currentVersion = currentRecord?.current_version || "0.0.0";
        const [cMajor, cMinor, cPatch] = currentVersion.split(".").map(Number);

        // Create rollback entry
        const rollbackVersion = `${cMajor}.${cMinor}.${cPatch + 1}`;
        const { data: rollbackRecord, error: insertError } = await supabase
          .from("version_control")
          .insert({
            current_version: rollbackVersion,
            log_message: `Rollback para versão ${targetVersion.current_version}: ${log_message || "Restauração manual"}`,
            trigger_type: "ROLLBACK",
            associated_data: targetVersion.associated_data || {},
          })
          .select()
          .single();

        if (insertError) {
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: "rollback",
            rolled_back_to: targetVersion.current_version,
            new_version: rollbackVersion,
            record: rollbackRecord,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Export Changelog
      if (action === "export_changelog") {
        const exportFormat = format || "markdown";

        const { data: history } = await supabase
          .from("version_control")
          .select("*")
          .order("timestamp", { ascending: false });

        let output: string;

        if (exportFormat === "json") {
          output = JSON.stringify(history, null, 2);
        } else {
          // Markdown format
          output = "# Changelog KnowYOU\n\n";
          output += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;
          output += "---\n\n";

          history?.forEach((record: any) => {
            output += `## Versão ${record.current_version}\n`;
            output += `**Data:** ${new Date(record.timestamp).toLocaleString("pt-BR")}\n\n`;
            output += `**Tipo:** ${record.trigger_type}\n\n`;
            output += `**Mensagem:** ${record.log_message}\n\n`;
            if (record.associated_data && Object.keys(record.associated_data).length > 0) {
              output += `**Dados Associados:** \`${JSON.stringify(record.associated_data)}\`\n\n`;
            }
            output += "---\n\n";
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            format: exportFormat,
            content: output,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Regular version increment
      if (!["patch", "minor", "major"].includes(action)) {
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be: patch, minor, major, rollback, or export_changelog" }),
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

      // Send email notification for Major releases
      if (action === "major") {
        try {
          const { data: adminSettings } = await supabase
            .from("admin_settings")
            .select("gmail_notification_email")
            .limit(1)
            .maybeSingle();

          const emailTo = adminSettings?.gmail_notification_email;

          if (emailTo) {
            await supabase.functions.invoke("send-email", {
              body: {
                to: emailTo,
                subject: `🚀 Nova Versão Major Lançada: ${newVersion}`,
                html: `
                  <h1>Nova Versão Major da Plataforma KnowYOU</h1>
                  <p><strong>Versão:</strong> ${newVersion}</p>
                  <p><strong>Versão Anterior:</strong> ${currentVersion}</p>
                  <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
                  <p><strong>Mensagem:</strong> ${log_message || "Lançamento de produção"}</p>
                  <hr />
                  <p>Esta é uma notificação automática de lançamento major.</p>
                `,
              },
            });
            console.log(`Email notification sent to: ${emailTo}`);
          }
        } catch (emailError) {
          console.error("Email notification failed:", emailError);
          // Don't fail the version update if email fails
        }
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
