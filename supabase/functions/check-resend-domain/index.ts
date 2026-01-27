// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          configured: false, 
          error: "RESEND_API_KEY não configurada" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[Resend] Checking domain status...");

    // Get all domains from Resend
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Resend] Error fetching domains:", data);
      return new Response(
        JSON.stringify({ 
          configured: true,
          verified: false,
          error: data.message || "Erro ao buscar domínios" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[Resend] Domains found:", data);

    // Check if iconsai.app domain exists and its status
    const domains = data.data || [];
    const iconsaiDomain = domains.find((d: any) => 
      d.name === "iconsai.app" || d.name?.includes("iconsai")
    );

    if (!iconsaiDomain) {
      return new Response(
        JSON.stringify({ 
          configured: true,
          verified: false,
          domains: domains.map((d: any) => ({ name: d.name, status: d.status })),
          error: "Domínio iconsai.app não encontrado no Resend. Adicione em resend.com/domains"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isVerified = iconsaiDomain.status === "verified";
    
    return new Response(
      JSON.stringify({ 
        configured: true,
        verified: isVerified,
        domain: {
          name: iconsaiDomain.name,
          status: iconsaiDomain.status,
          created_at: iconsaiDomain.created_at,
          region: iconsaiDomain.region
        },
        message: isVerified 
          ? "Domínio verificado e pronto para envio" 
          : `Domínio com status "${iconsaiDomain.status}". Verifique os registros DNS em resend.com/domains`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[Resend] Error checking domain:", error);
    return new Response(
      JSON.stringify({ 
        configured: false,
        verified: false,
        error: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
