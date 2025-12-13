import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
