import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BCBDataPoint {
  data: string;
  valor: string;
}

interface IBGEResult {
  id: string;
  variavel: string;
  unidade: string;
  resultados: Array<{
    classificacoes: unknown[];
    series: Array<{
      localidade: { id: string; nivel: { id: string; nome: string }; nome: string };
      serie: Record<string, string>;
    }>;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { indicatorId } = await req.json();

    if (!indicatorId) {
      return new Response(
        JSON.stringify({ error: 'indicatorId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[COMPARE-INSERT] Starting comparison for indicator: ${indicatorId}`);

    // 1. Get indicator with API config
    const { data: indicator, error: indicatorError } = await supabase
      .from('economic_indicators')
      .select(`id, name, code, unit, api_id, system_api_registry!inner (id, name, provider, last_raw_response, last_response_at)`)
      .eq('id', indicatorId)
      .single();

    if (indicatorError || !indicator) {
      console.error('[COMPARE-INSERT] Indicator not found:', indicatorError);
      return new Response(
        JSON.stringify({ error: 'Indicator not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiConfig = Array.isArray(indicator.system_api_registry) 
      ? indicator.system_api_registry[0] 
      : indicator.system_api_registry;

    if (!apiConfig?.last_raw_response) {
      return new Response(
        JSON.stringify({ error: 'No raw JSON data available for this indicator', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawJson = apiConfig.last_raw_response;
    const provider = apiConfig.provider;

    console.log(`[COMPARE-INSERT] Provider: ${provider}`);
    console.log(`[COMPARE-INSERT] Last response at: ${apiConfig.last_response_at}`);

    // 2. Parse JSON and extract date-value pairs
    const parsedValues: Array<{ reference_date: string; value: number }> = [];

    if (provider === 'BCB') {
      const bcbData = rawJson as BCBDataPoint[];
      for (const item of bcbData) {
        if (item.data && item.valor) {
          const [day, month, year] = item.data.split('/');
          const refDate = `${year}-${month}-${day}`;
          const value = parseFloat(item.valor.replace(',', '.'));
          if (!isNaN(value)) {
            parsedValues.push({ reference_date: refDate, value });
          }
        }
      }
    } else if (provider === 'IBGE') {
      const ibgeData = rawJson as IBGEResult[];
      if (ibgeData.length > 0 && ibgeData[0].resultados) {
        for (const resultado of ibgeData[0].resultados) {
          for (const serie of resultado.series || []) {
            const serieData = serie.serie || {};
            for (const [period, value] of Object.entries(serieData)) {
              if (!value || value === '-' || value === '...') continue;
              
              let refDate: string;
              if (period.length === 6) {
                refDate = `${period.substring(0, 4)}-${period.substring(4, 6)}-01`;
              } else if (period.length === 4) {
                refDate = `${period}-01-01`;
              } else {
                refDate = `${period}-01-01`;
              }
              
              const numValue = parseFloat(value.replace(',', '.'));
              if (!isNaN(numValue)) {
                parsedValues.push({ reference_date: refDate, value: numValue });
              }
            }
          }
        }
      }
    }

    console.log(`[COMPARE-INSERT] Parsed ${parsedValues.length} values from JSON`);

    if (parsedValues.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          jsonRecords: 0, 
          existingRecords: 0, 
          insertedRecords: 0,
          message: 'No data in JSON to compare'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get existing records from indicator_values
    const { data: existingRecords, error: existingError } = await supabase
      .from('indicator_values')
      .select('reference_date')
      .eq('indicator_id', indicatorId);

    if (existingError) {
      console.error('[COMPARE-INSERT] Error fetching existing records:', existingError);
      throw existingError;
    }

    const existingDates = new Set((existingRecords || []).map(r => r.reference_date));
    console.log(`[COMPARE-INSERT] Existing records in DB: ${existingDates.size}`);

    // 4. Find missing records (in JSON but not in DB)
    const missingValues = parsedValues.filter(v => !existingDates.has(v.reference_date));
    console.log(`[COMPARE-INSERT] Missing records to insert: ${missingValues.length}`);

    if (missingValues.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          jsonRecords: parsedValues.length, 
          existingRecords: existingDates.size, 
          insertedRecords: 0,
          message: 'All JSON records already exist in database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. INSERT only missing records (never UPDATE/DELETE)
    const valuesToInsert = missingValues.map(v => ({
      indicator_id: indicatorId,
      reference_date: v.reference_date,
      value: v.value
    }));

    const { error: insertError, count } = await supabase
      .from('indicator_values')
      .insert(valuesToInsert, { count: 'exact' });

    if (insertError) {
      console.error('[COMPARE-INSERT] INSERT error:', insertError);
      throw insertError;
    }

    console.log(`[COMPARE-INSERT] ✅ Successfully inserted ${count ?? valuesToInsert.length} missing records`);

    // 6. Log the operation
    await supabase.from('user_activity_logs').insert({
      user_email: 'system@knowyou.app',
      action_category: 'MANDATORY_INSERT',
      action: `Inserted ${count ?? valuesToInsert.length} missing records for ${indicator.name}`,
      details: { 
        indicatorId,
        indicatorName: indicator.name,
        jsonRecords: parsedValues.length,
        existingRecords: existingDates.size,
        insertedRecords: count ?? valuesToInsert.length
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        jsonRecords: parsedValues.length, 
        existingRecords: existingDates.size, 
        insertedRecords: count ?? valuesToInsert.length,
        message: `Inserted ${count ?? valuesToInsert.length} missing records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[COMPARE-INSERT] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
