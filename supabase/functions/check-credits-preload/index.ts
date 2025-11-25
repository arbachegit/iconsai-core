import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreloadConfig {
  enabled: boolean;
  last_check: string | null;
  last_preload: string | null;
  check_interval_minutes: number;
}

const CRITICAL_SECTIONS = ["software", "internet", "ia-nova-era", "knowyou"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar configuração
    const { data: config, error: configError } = await supabase
      .from("auto_preload_config")
      .select("*")
      .single();

    if (configError || !config || !config.enabled) {
      return new Response(
        JSON.stringify({ message: "Auto-preload disabled", config }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedConfig = config as unknown as PreloadConfig;

    // Verificar se já passou tempo suficiente desde último check
    const lastCheck = typedConfig.last_check ? new Date(typedConfig.last_check) : null;
    const now = new Date();
    const minutesSinceLastCheck = lastCheck 
      ? (now.getTime() - lastCheck.getTime()) / (1000 * 60)
      : Infinity;

    if (minutesSinceLastCheck < typedConfig.check_interval_minutes) {
      return new Response(
        JSON.stringify({ 
          message: "Too soon since last check",
          minutesSinceLastCheck,
          intervalMinutes: typedConfig.check_interval_minutes
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar last_check
    await supabase
      .from("auto_preload_config")
      .update({ last_check: now.toISOString() })
      .eq("id", config.id);

    // Verificar se há imagens faltantes nas seções críticas
    const sectionsNeedingImages: string[] = [];

    for (const sectionId of CRITICAL_SECTIONS) {
      const { data: images, error: imagesError } = await supabase
        .from("generated_images")
        .select("id")
        .eq("section_id", sectionId);

      if (imagesError) {
        console.error(`Error checking section ${sectionId}:`, imagesError);
        continue;
      }

      // Se não há imagens ou tem menos de 4, precisa gerar
      if (!images || images.length < 4) {
        sectionsNeedingImages.push(sectionId);
      }
    }

    if (sectionsNeedingImages.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "All critical sections have images cached",
          checked: CRITICAL_SECTIONS
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sections needing images: ${sectionsNeedingImages.join(", ")}`);

    // Atualizar last_preload
    await supabase
      .from("auto_preload_config")
      .update({ last_preload: now.toISOString() })
      .eq("id", config.id);

    // Registrar no log
    await supabase.rpc("log_credit_usage", {
      p_operation_type: "auto_preload_check",
      p_success: true,
      p_metadata: {
        sections_needing_images: sectionsNeedingImages,
        total_critical_sections: CRITICAL_SECTIONS.length
      }
    });

    return new Response(
      JSON.stringify({ 
        message: "Auto-preload check completed",
        sectionsNeedingImages,
        note: "Images will be generated when users visit the page"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-credits-preload:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});