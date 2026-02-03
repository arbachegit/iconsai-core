// ============================================
// VERSAO: 1.0.0 | TEMPORÁRIO
// Criar tabela password_reset_tokens
// DELETE AFTER USE
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log("=== SETUP PASSWORD RESET TABLE ===");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create table using raw SQL via rpc
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          verification_code TEXT,
          pending_password TEXT,
          step TEXT DEFAULT 'awaiting_password',
          code_attempts INTEGER DEFAULT 0,
          expires_at TIMESTAMPTZ NOT NULL,
          code_expires_at TIMESTAMPTZ,
          used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);

        ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
      `
    });

    if (tableError) {
      // RPC doesn't exist, try alternative approach
      console.log("RPC not available, trying direct insert test...");

      // Just test if table exists by trying to select
      const { error: selectError } = await supabase
        .from('password_reset_tokens')
        .select('id')
        .limit(1);

      if (selectError && selectError.message.includes('does not exist')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Table does not exist. Please create it manually via SQL Editor.",
            sql: `
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  verification_code TEXT,
  pending_password TEXT,
  step TEXT DEFAULT 'awaiting_password',
  code_attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  code_expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.password_reset_tokens
  FOR ALL
  USING (auth.role() = 'service_role');
            `
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Table exists
      return new Response(
        JSON.stringify({ success: true, message: "Table already exists!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== TABLE CREATED SUCCESSFULLY ===");

    return new Response(
      JSON.stringify({ success: true, message: "Table created successfully!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
