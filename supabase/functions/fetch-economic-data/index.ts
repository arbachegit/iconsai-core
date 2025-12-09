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

interface ApiConfig {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { indicatorId, fetchAll } = await req.json().catch(() => ({}));

    console.log('[FETCH-ECONOMIC] Starting fetch...', { indicatorId, fetchAll });

    // Get indicators to fetch
    let indicatorsQuery = supabase
      .from('economic_indicators')
      .select(`id, name, code, unit, api_id, system_api_registry!inner (id, name, provider, base_url, status)`)
      .eq('system_api_registry.status', 'active');

    if (!fetchAll && indicatorId) {
      indicatorsQuery = indicatorsQuery.eq('id', indicatorId);
    }

    const { data: indicators, error: indicatorsError } = await indicatorsQuery;

    if (indicatorsError) throw indicatorsError;

    if (!indicators || indicators.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No indicators to fetch', recordsInserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalRecordsInserted = 0;
    const results: Array<{ indicator: string; records: number; status: string }> = [];

    for (const indicator of indicators) {
      try {
        const apiConfigRaw = indicator.system_api_registry;
        if (!apiConfigRaw) continue;
        
        // Handle both array and object cases from Supabase
        const apiConfig: ApiConfig = Array.isArray(apiConfigRaw) ? apiConfigRaw[0] : apiConfigRaw;
        if (!apiConfig) continue;

        console.log(`[FETCH-ECONOMIC] Fetching ${indicator.name} from ${apiConfig.provider}...`);

        const response = await fetch(apiConfig.base_url);
        if (!response.ok) {
          results.push({ indicator: indicator.name, records: 0, status: 'error' });
          continue;
        }

        const data = await response.json();
        let valuesToInsert: Array<{ indicator_id: string; reference_date: string; value: number }> = [];

        if (apiConfig.provider === 'BCB') {
          const bcbData = data as BCBDataPoint[];
          valuesToInsert = bcbData.map((item) => {
            const [day, month, year] = item.data.split('/');
            return {
              indicator_id: indicator.id,
              reference_date: `${year}-${month}-${day}`,
              value: parseFloat(item.valor.replace(',', '.')),
            };
          }).filter(v => !isNaN(v.value));
        } else if (apiConfig.provider === 'IBGE') {
          const ibgeData = data as IBGEResult[];
          if (ibgeData.length > 0 && ibgeData[0].resultados) {
            const series = ibgeData[0].resultados[0]?.series[0]?.serie || {};
            valuesToInsert = Object.entries(series).map(([period, value]) => {
              let refDate: string;
              if (period.length === 6) {
                refDate = `${period.substring(0, 4)}-${period.substring(4, 6)}-01`;
              } else {
                refDate = `${period}-01-01`;
              }
              return {
                indicator_id: indicator.id,
                reference_date: refDate,
                value: parseFloat(value.replace(',', '.')),
              };
            }).filter(v => !isNaN(v.value));
          }
        }

        if (valuesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('indicator_values')
            .upsert(valuesToInsert, { onConflict: 'indicator_id,reference_date', ignoreDuplicates: false });

          if (insertError) {
            results.push({ indicator: indicator.name, records: 0, status: 'error' });
          } else {
            totalRecordsInserted += valuesToInsert.length;
            results.push({ indicator: indicator.name, records: valuesToInsert.length, status: 'success' });
          }
        }
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] Error:`, err);
        results.push({ indicator: indicator.name, records: 0, status: 'error' });
      }
    }

    await supabase.from('user_activity_logs').insert({
      user_email: 'system@knowyou.app',
      action_category: 'ECONOMIC_DATA_FETCH',
      action: `Fetched economic data | Total: ${totalRecordsInserted}`,
      details: { results, totalRecordsInserted }
    });

    return new Response(
      JSON.stringify({ success: true, recordsInserted: totalRecordsInserted, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FETCH-ECONOMIC] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
});
