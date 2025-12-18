import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== SIDRA CONFIG FOR RENDA PER CAPITA ==========
const SIDRA_CONFIG = {
  BASE_URL: 'https://apisidra.ibge.gov.br/values',
  TABLES: {
    RENDIMENTO_CLASSES: '7531',
    GINI: '7435',
  }
};

const INDICATOR_IDS = {
  RENDA_MEDIA: '33162f8c-3f2a-4306-a7ba-65b38f58cb99',
  RENDA_MEDIA_UF: '5311dc65-8786-4427-b450-3bb8f7504b41',
  GINI: 'e2f852c0-9b95-4d2e-8f81-7c7b93d2bfbd',
  GINI_UF: 'a52011cf-4046-4f07-aa06-79fc0fc88627',
};

// ========== SIDRA RENDA FUNCTIONS ==========
interface SIDRARecord {
  [key: string]: string;
}

interface RendaDataResult {
  national: Array<{ indicator_id: string; reference_date: string; value: number }>;
  regional: Array<{ indicator_id: string; reference_date: string; value: number; uf_code: number }>;
}

async function fetchSIDRARendaData(): Promise<RendaDataResult> {
  const result: RendaDataResult = { national: [], regional: [] };
  
  // Fetch Rendimento Médio (Table 7531) - Brasil and UFs
  // Class 49040 = Total (all income classes combined)
  const rendimentoUrlBrasil = `${SIDRA_CONFIG.BASE_URL}/t/${SIDRA_CONFIG.TABLES.RENDIMENTO_CLASSES}/n1/all/v/allxp/p/all/c58/49040/f/n`;
  const rendimentoUrlUF = `${SIDRA_CONFIG.BASE_URL}/t/${SIDRA_CONFIG.TABLES.RENDIMENTO_CLASSES}/n3/all/v/allxp/p/all/c58/49040/f/n`;
  
  // Fetch GINI (Table 7435) - Brasil and UFs
  const giniUrlBrasil = `${SIDRA_CONFIG.BASE_URL}/t/${SIDRA_CONFIG.TABLES.GINI}/n1/all/v/allxp/p/all/f/n`;
  const giniUrlUF = `${SIDRA_CONFIG.BASE_URL}/t/${SIDRA_CONFIG.TABLES.GINI}/n3/all/v/allxp/p/all/f/n`;
  
  console.log('[SIDRA-RENDA] Fetching Rendimento Brasil...');
  try {
    const respRendBR = await fetch(rendimentoUrlBrasil);
    if (respRendBR.ok) {
      const data: SIDRARecord[] = await respRendBR.json();
      // Skip header row (index 0)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const year = row['D3C'] || row['D4C']; // Period code
        const value = parseFloat(row['V']);
        if (year && !isNaN(value) && value > 0) {
          result.national.push({
            indicator_id: INDICATOR_IDS.RENDA_MEDIA,
            reference_date: `${year}-01-01`,
            value
          });
        }
      }
      console.log(`[SIDRA-RENDA] Rendimento Brasil: ${result.national.length} records`);
    }
  } catch (err) {
    console.error('[SIDRA-RENDA] Error fetching Rendimento Brasil:', err);
  }
  
  console.log('[SIDRA-RENDA] Fetching Rendimento UFs...');
  try {
    const respRendUF = await fetch(rendimentoUrlUF);
    if (respRendUF.ok) {
      const data: SIDRARecord[] = await respRendUF.json();
      let ufCount = 0;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const ufCode = parseInt(row['D1C'] || row['D2C'], 10); // UF code
        const year = row['D3C'] || row['D4C']; // Period code
        const value = parseFloat(row['V']);
        if (ufCode >= 11 && ufCode <= 53 && year && !isNaN(value) && value > 0) {
          result.regional.push({
            indicator_id: INDICATOR_IDS.RENDA_MEDIA_UF,
            reference_date: `${year}-01-01`,
            value,
            uf_code: ufCode
          });
          ufCount++;
        }
      }
      console.log(`[SIDRA-RENDA] Rendimento UFs: ${ufCount} records`);
    }
  } catch (err) {
    console.error('[SIDRA-RENDA] Error fetching Rendimento UFs:', err);
  }
  
  console.log('[SIDRA-RENDA] Fetching GINI Brasil...');
  try {
    const respGiniBR = await fetch(giniUrlBrasil);
    if (respGiniBR.ok) {
      const data: SIDRARecord[] = await respGiniBR.json();
      let giniCount = 0;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const year = row['D2C'] || row['D3C']; // Period code
        const value = parseFloat(row['V']);
        if (year && !isNaN(value) && value > 0) {
          result.national.push({
            indicator_id: INDICATOR_IDS.GINI,
            reference_date: `${year}-01-01`,
            value
          });
          giniCount++;
        }
      }
      console.log(`[SIDRA-RENDA] GINI Brasil: ${giniCount} records`);
    }
  } catch (err) {
    console.error('[SIDRA-RENDA] Error fetching GINI Brasil:', err);
  }
  
  console.log('[SIDRA-RENDA] Fetching GINI UFs...');
  try {
    const respGiniUF = await fetch(giniUrlUF);
    if (respGiniUF.ok) {
      const data: SIDRARecord[] = await respGiniUF.json();
      let giniUFCount = 0;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const ufCode = parseInt(row['D1C'] || row['D2C'], 10); // UF code
        const year = row['D2C'] || row['D3C']; // Period code (may shift based on territorial level)
        const value = parseFloat(row['V']);
        if (ufCode >= 11 && ufCode <= 53 && year && !isNaN(value) && value > 0) {
          result.regional.push({
            indicator_id: INDICATOR_IDS.GINI_UF,
            reference_date: `${year}-01-01`,
            value,
            uf_code: ufCode
          });
          giniUFCount++;
        }
      }
      console.log(`[SIDRA-RENDA] GINI UFs: ${giniUFCount} records`);
    }
  } catch (err) {
    console.error('[SIDRA-RENDA] Error fetching GINI UFs:', err);
  }
  
  return result;
}

// deno-lint-ignore no-explicit-any
async function syncRendaPerCapita(supabase: any): Promise<{ inserted: number }> {
  console.log('[SIDRA-RENDA] Starting Renda Per Capita sync...');
  
  const data = await fetchSIDRARendaData();
  let totalInserted = 0;
  
  // Insert national data into indicator_values
  if (data.national.length > 0) {
    console.log(`[SIDRA-RENDA] Upserting ${data.national.length} national records...`);
    const batchSize = 500;
    for (let i = 0; i < data.national.length; i += batchSize) {
      const batch = data.national.slice(i, i + batchSize);
      const { error } = await supabase
        .from('indicator_values')
        .upsert(batch, { onConflict: 'indicator_id,reference_date' });
      
      if (error) {
        console.error(`[SIDRA-RENDA] Error inserting national batch ${i}:`, error);
      } else {
        totalInserted += batch.length;
      }
    }
  }
  
  // Insert regional data into indicator_regional_values
  if (data.regional.length > 0) {
    console.log(`[SIDRA-RENDA] Upserting ${data.regional.length} regional records...`);
    const batchSize = 500;
    for (let i = 0; i < data.regional.length; i += batchSize) {
      const batch = data.regional.slice(i, i + batchSize);
      const { error } = await supabase
        .from('indicator_regional_values')
        .upsert(batch, { onConflict: 'indicator_id,reference_date,uf_code' });
      
      if (error) {
        console.error(`[SIDRA-RENDA] Error inserting regional batch ${i}:`, error);
      } else {
        totalInserted += batch.length;
      }
    }
  }
  
  console.log(`[SIDRA-RENDA] Sync complete. Total inserted: ${totalInserted}`);
  return { inserted: totalInserted };
}

// ========== MAIN EDGE FUNCTION ==========
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[AUTO-SYNC] Starting automatic indicator synchronization...');
    
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = now.getDate();
    
    // Fetch all APIs with auto_fetch_enabled = true
    const { data: apis, error: apisError } = await supabase
      .from('system_api_registry')
      .select('id, name, auto_fetch_interval, last_response_at')
      .eq('status', 'active')
      .eq('auto_fetch_enabled', true);
    
    if (apisError) {
      console.error('[AUTO-SYNC] Error fetching APIs:', apisError);
      throw apisError;
    }
    
    if (!apis || apis.length === 0) {
      console.log('[AUTO-SYNC] No APIs configured for automatic sync');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No APIs configured for automatic sync',
        synced: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[AUTO-SYNC] Found ${apis.length} APIs with auto-fetch enabled`);
    
    const results: Array<{ api: string; success: boolean; error?: string; insertedCount?: number }> = [];
    
    for (const api of apis) {
      const interval = api.auto_fetch_interval || 'daily|09:00';
      const parts = interval.split('|');
      const frequency = parts[0];
      
      // Check if it's time to sync based on frequency
      let shouldSync = false;
      
      if (frequency === 'daily') {
        // Sync daily APIs every time this function runs
        shouldSync = true;
      } else if (frequency === 'weekly') {
        // Sync weekly APIs only on Mondays (day 1)
        const configuredDay = parts[1] || 'monday';
        const dayMap: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6
        };
        shouldSync = dayOfWeek === (dayMap[configuredDay] || 1);
      } else if (frequency === 'monthly') {
        // Sync monthly APIs only on day 1 of the month
        shouldSync = dayOfMonth === 1;
      }
      
      if (!shouldSync) {
        console.log(`[AUTO-SYNC] Skipping ${api.name} - not scheduled for today (${frequency})`);
        continue;
      }
      
      console.log(`[AUTO-SYNC] Syncing ${api.name}...`);
      
      // Find linked indicators for this API
      const { data: indicators, error: indicatorError } = await supabase
        .from('economic_indicators')
        .select('id, name')
        .eq('api_id', api.id);
      
      if (indicatorError || !indicators || indicators.length === 0) {
        console.log(`[AUTO-SYNC] No indicators linked to ${api.name}`);
        results.push({ api: api.name, success: false, error: 'No linked indicators' });
        continue;
      }
      
      // Sync each indicator
      for (const indicator of indicators) {
        try {
          const { data, error } = await supabase.functions.invoke('fetch-economic-data', {
            body: { indicatorId: indicator.id }
          });
          
          if (error) {
            console.error(`[AUTO-SYNC] Error syncing ${indicator.name}:`, error);
            results.push({ api: api.name, success: false, error: error.message });
          } else {
            const insertedCount = data?.results?.[0]?.insertedCount || data?.insertedCount || 0;
            console.log(`[AUTO-SYNC] ${indicator.name}: ${insertedCount} records inserted`);
            results.push({ api: api.name, success: true, insertedCount });
          }
        } catch (err) {
          console.error(`[AUTO-SYNC] Exception syncing ${indicator.name}:`, err);
          results.push({ api: api.name, success: false, error: String(err) });
        }
      }
      
      // Update last_response_at for the API
      await supabase
        .from('system_api_registry')
        .update({ last_response_at: new Date().toISOString() })
        .eq('id', api.id);
      
      // Small delay between APIs to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // ========== SYNC RENDA PER CAPITA (SIDRA) ==========
    console.log('[AUTO-SYNC] Starting Renda Per Capita sync...');
    try {
      const rendaResult = await syncRendaPerCapita(supabase);
      results.push({ 
        api: 'SIDRA Renda Per Capita', 
        success: true, 
        insertedCount: rendaResult.inserted 
      });
      console.log(`[AUTO-SYNC] Renda Per Capita: ${rendaResult.inserted} records inserted`);
    } catch (err) {
      console.error('[AUTO-SYNC] Error syncing Renda Per Capita:', err);
      results.push({ 
        api: 'SIDRA Renda Per Capita', 
        success: false, 
        error: String(err) 
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`[AUTO-SYNC] Completed: ${successCount} success, ${failedCount} failed`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Auto-sync completed: ${successCount} success, ${failedCount} failed`,
      synced: successCount,
      failed: failedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AUTO-SYNC] Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
