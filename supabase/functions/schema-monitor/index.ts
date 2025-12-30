import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Critical tables and their required columns for PWA flow
const CRITICAL_SCHEMA = {
  tables: {
    user_invitations: ['token', 'status', 'expires_at', 'pwa_access', 'completed_at', 'name', 'email'],
    pwa_devices: ['device_fingerprint', 'user_name', 'user_email', 'user_registration_id', 'is_trusted', 'is_verified', 'pwa_slugs'],
    pwa_sessions: ['device_id', 'token', 'pwa_access', 'is_active', 'has_app_access', 'user_name'],
    user_registrations: ['email', 'pwa_registered_at', 'has_app_access', 'pwa_access', 'first_name', 'last_name'],
    schema_audit_log: ['check_type', 'entity_name', 'divergence_type', 'severity', 'is_resolved'],
  },
  functions: ['register_pwa_user', 'verify_pwa_invitation', 'get_pwa_devices_schema'],
  critical_references: [
    { function: 'register_pwa_user', must_contain: 'user_invitations', must_not_contain: 'pwa_invitations' },
  ],
};

interface DivergenceRecord {
  check_type: string;
  entity_name: string;
  expected_state: object;
  actual_state: object;
  divergence_type: string;
  severity: 'critical' | 'warning' | 'info';
}

interface TableResult {
  status: string;
  columns?: string[];
  missing?: string[];
}

interface FunctionResult {
  status: string;
}

interface ReferenceResult {
  status: string;
  contains_required?: boolean;
  contains_forbidden?: boolean;
}

interface Results {
  tables: Record<string, TableResult>;
  functions: Record<string, FunctionResult>;
  references: Record<string, ReferenceResult>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const divergences: DivergenceRecord[] = [];
  const results: Results = {
    tables: {},
    functions: {},
    references: {},
  };

  console.log('[schema-monitor] Starting schema verification...');

  try {
    // 1. Check all critical tables and their columns
    for (const [tableName, requiredColumns] of Object.entries(CRITICAL_SCHEMA.tables)) {
      console.log(`[schema-monitor] Checking table: ${tableName}`);
      
      // Check if table exists
      const { data: tableExists } = await supabase.rpc('table_exists', { p_table_name: tableName });
      
      if (!tableExists) {
        divergences.push({
          check_type: 'table_existence',
          entity_name: tableName,
          expected_state: { exists: true },
          actual_state: { exists: false },
          divergence_type: 'missing_table',
          severity: 'critical',
        });
        results.tables[tableName] = { status: 'missing', columns: [] };
        continue;
      }

      // Get table columns
      const { data: columns, error: colError } = await supabase.rpc('get_table_columns', { p_table_name: tableName });
      
      if (colError) {
        console.error(`[schema-monitor] Error getting columns for ${tableName}:`, colError);
        continue;
      }

      const existingColumns = columns?.map((c: { column_name: string }) => c.column_name) || [];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        divergences.push({
          check_type: 'table_column',
          entity_name: tableName,
          expected_state: { columns: requiredColumns },
          actual_state: { columns: existingColumns, missing: missingColumns },
          divergence_type: 'missing_column',
          severity: 'critical',
        });
      }

      results.tables[tableName] = {
        status: missingColumns.length > 0 ? 'incomplete' : 'ok',
        columns: existingColumns,
        missing: missingColumns,
      };
    }

    // 2. Check critical functions exist
    for (const funcName of CRITICAL_SCHEMA.functions) {
      console.log(`[schema-monitor] Checking function: ${funcName}`);
      
      const { data: funcExists } = await supabase.rpc('function_exists', { p_function_name: funcName });
      
      if (!funcExists) {
        divergences.push({
          check_type: 'function_existence',
          entity_name: funcName,
          expected_state: { exists: true },
          actual_state: { exists: false },
          divergence_type: 'missing_function',
          severity: 'critical',
        });
        results.functions[funcName] = { status: 'missing' };
        continue;
      }

      results.functions[funcName] = { status: 'ok' };
    }

    // 3. Check function references (e.g., register_pwa_user should NOT reference pwa_invitations)
    for (const check of CRITICAL_SCHEMA.critical_references) {
      console.log(`[schema-monitor] Checking function references: ${check.function}`);
      
      const { data: funcDef } = await supabase.rpc('get_function_definition', { p_function_name: check.function });
      
      if (!funcDef) {
        results.references[check.function] = { status: 'function_not_found' };
        continue;
      }

      const funcDefStr = String(funcDef);
      const containsRequired = funcDefStr.toLowerCase().includes(check.must_contain.toLowerCase());
      const containsForbidden = funcDefStr.toLowerCase().includes(check.must_not_contain.toLowerCase());

      if (!containsRequired) {
        divergences.push({
          check_type: 'function_reference',
          entity_name: check.function,
          expected_state: { must_contain: check.must_contain },
          actual_state: { contains: false },
          divergence_type: 'missing_reference',
          severity: 'warning',
        });
      }

      if (containsForbidden) {
        divergences.push({
          check_type: 'function_reference',
          entity_name: check.function,
          expected_state: { must_not_contain: check.must_not_contain },
          actual_state: { contains_forbidden: true },
          divergence_type: 'invalid_reference',
          severity: 'critical',
        });
      }

      results.references[check.function] = {
        status: containsRequired && !containsForbidden ? 'ok' : 'issue',
        contains_required: containsRequired,
        contains_forbidden: containsForbidden,
      };
    }

    // 4. Log divergences to schema_audit_log
    if (divergences.length > 0) {
      console.log(`[schema-monitor] Found ${divergences.length} divergences, logging...`);
      
      for (const div of divergences) {
        await supabase.from('schema_audit_log').insert({
          check_type: div.check_type,
          entity_name: div.entity_name,
          expected_state: div.expected_state,
          actual_state: div.actual_state,
          divergence_type: div.divergence_type,
          severity: div.severity,
        });
      }

      // Create admin notification for critical issues
      const criticalCount = divergences.filter(d => d.severity === 'critical').length;
      if (criticalCount > 0) {
        await supabase.from('admin_notifications').insert({
          type: 'schema_divergence_critical',
          title: `Schema Monitor: ${criticalCount} problema(s) crítico(s) detectado(s)`,
          message: `Divergências encontradas: ${divergences.map(d => d.entity_name).join(', ')}`,
        });
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      total_divergences: divergences.length,
      critical: divergences.filter(d => d.severity === 'critical').length,
      warnings: divergences.filter(d => d.severity === 'warning').length,
      tables_checked: Object.keys(CRITICAL_SCHEMA.tables).length,
      functions_checked: CRITICAL_SCHEMA.functions.length,
      all_ok: divergences.length === 0,
    };

    console.log('[schema-monitor] Verification complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        divergences,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[schema-monitor] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
