import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  success: boolean;
  latencyMs: number;
  statusCode: number | null;
  statusText: string;
  contentType: string | null;
  preview: any[] | null;
  error: string | null;
  timeout: boolean;
  syncMetadata: SyncMetadata | null;
}

interface SyncMetadata {
  extracted_count: number;
  period_start: string | null;
  period_end: string | null;
  fields_detected: string[];
  last_record_value: string | null;
  fetch_timestamp: string;
}

// Format date as DD/MM/YYYY for BCB API
function formatDateBCB(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert BCB date DD/MM/YYYY to ISO YYYY-MM-DD
function bcbDateToISO(bcbDate: string): string {
  const [day, month, year] = bcbDate.split('/');
  return `${year}-${month}-${day}`;
}

// Analyze API response and extract metadata
function analyzeApiResponse(data: unknown, provider: string): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: [],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!data) return metadata;

  // Handle array responses (BCB format)
  if (Array.isArray(data) && data.length > 0) {
    metadata.extracted_count = data.length;
    metadata.fields_detected = Object.keys(data[0]);

    // BCB format: {data: "DD/MM/YYYY", valor: "X.XX"}
    if (provider === 'BCB' && data[0].data && data[0].valor) {
      const dates = data.map(d => d.data).sort((a, b) => {
        const dateA = new Date(bcbDateToISO(a));
        const dateB = new Date(bcbDateToISO(b));
        return dateA.getTime() - dateB.getTime();
      });
      
      metadata.period_start = bcbDateToISO(dates[0]);
      metadata.period_end = bcbDateToISO(dates[dates.length - 1]);
      metadata.last_record_value = data[data.length - 1].valor;
    }
  } 
  // Handle IBGE nested structure
  else if (!Array.isArray(data) && typeof data === 'object') {
    const ibgeData = data as any[];
    if (Array.isArray(ibgeData) && ibgeData.length > 0 && ibgeData[0].resultados) {
      const resultados = ibgeData[0].resultados;
      if (resultados.length > 0 && resultados[0].series?.length > 0) {
        const serie = resultados[0].series[0].serie || {};
        const periods = Object.keys(serie).filter(k => serie[k] && serie[k] !== '-');
        
        metadata.extracted_count = periods.length;
        metadata.fields_detected = ['D2C', 'V', 'variavel', 'unidade'];
        
        if (periods.length > 0) {
          periods.sort();
          const formatPeriod = (p: string) => {
            if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`;
            return `${p}-01-01`;
          };
          metadata.period_start = formatPeriod(periods[0]);
          metadata.period_end = formatPeriod(periods[periods.length - 1]);
          metadata.last_record_value = serie[periods[periods.length - 1]];
        }
      }
    }
  }

  // For other array types, just extract count and fields
  if (Array.isArray(data) && data.length > 0 && !metadata.period_start) {
    metadata.extracted_count = data.length;
    if (typeof data[0] === 'object' && data[0] !== null) {
      metadata.fields_detected = Object.keys(data[0]);
    }
  }

  return metadata;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiId, baseUrl } = await req.json();

    if (!apiId || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'apiId and baseUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TEST-API] Testing connection to: ${baseUrl}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API provider info INCLUDING configured dates
    const { data: apiInfo } = await supabase
      .from('system_api_registry')
      .select('provider, target_table, fetch_start_date, fetch_end_date')
      .eq('id', apiId)
      .single();

    const provider = apiInfo?.provider || 'Unknown';
    const targetTable = apiInfo?.target_table || 'indicator_values';
    
    console.log(`[TEST-API] ====== AUDIT: DATE CONFIGURATION ======`);
    console.log(`[TEST-API] Configured fetch_start_date: ${apiInfo?.fetch_start_date}`);
    console.log(`[TEST-API] Configured fetch_end_date: ${apiInfo?.fetch_end_date}`);

    // Prepare test result
    const result: TestResult = {
      success: false,
      latencyMs: 0,
      statusCode: null,
      statusText: '',
      contentType: null,
      preview: null,
      error: null,
      timeout: false,
      syncMetadata: null,
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Detect provider from URL
    const isBCB = baseUrl.includes('api.bcb.gov.br');
    const isIBGE = baseUrl.includes('servicodados.ibge.gov.br');

    // Dynamic headers based on provider
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'identity',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Construct test URL - for BCB, use CONFIGURED dates or 1-year fallback
    let testUrl = baseUrl;
    
    if (isBCB) {
      // Use configured dates from database, or fallback to 1-year window
      const hasConfiguredDates = apiInfo?.fetch_start_date && apiInfo?.fetch_end_date;
      
      let startDate: Date;
      let endDate: Date;
      
      if (hasConfiguredDates) {
        startDate = new Date(apiInfo.fetch_start_date);
        endDate = new Date(apiInfo.fetch_end_date);
        console.log(`[TEST-API] BCB API - Using CONFIGURED dates: ${apiInfo.fetch_start_date} to ${apiInfo.fetch_end_date}`);
      } else {
        // Fallback to 1-year window for testing
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        console.log(`[TEST-API] BCB API - No configured dates, using 1-year fallback window`);
      }
      
      // Remove any existing date parameters
      const cleanUrl = baseUrl.split('&dataInicial')[0].split('?dataInicial')[0];
      const hasParams = cleanUrl.includes('?');
      const separator = hasParams ? '&' : '?';
      
      testUrl = `${cleanUrl}${separator}dataInicial=${formatDateBCB(startDate)}&dataFinal=${formatDateBCB(endDate)}`;
      
      console.log(`[TEST-API] Test URL: ${testUrl}`);
    } else if (isIBGE) {
      console.log(`[TEST-API] IBGE API detected - using standard request`);
    } else {
      console.log(`[TEST-API] Generic API - using standard request`);
    }

    console.log(`[TEST-API] Request headers:`, requestHeaders);

    const startTime = performance.now();

    try {
      const fetchOptions: RequestInit = {
        method: 'GET',
        signal: controller.signal,
        headers: requestHeaders,
      };

      const response = await fetch(testUrl, fetchOptions);

      clearTimeout(timeoutId);
      const endTime = performance.now();

      result.latencyMs = Math.round(endTime - startTime);
      result.statusCode = response.status;
      result.statusText = response.statusText;
      result.contentType = response.headers.get('Content-Type');

      console.log(`[TEST-API] Response: ${response.status} ${response.statusText} (${result.latencyMs}ms)`);

      // Check if response is OK (200-299)
      if (response.ok) {
        // Try to parse JSON response
        const text = await response.text();
        
        try {
          const data = JSON.parse(text);
          
          // Analyze response and extract metadata
          result.syncMetadata = analyzeApiResponse(data, provider);
          console.log(`[TEST-API] Sync metadata:`, result.syncMetadata);
          
          // Extract preview (first 2 items if array, or first 2 keys if object)
          if (Array.isArray(data)) {
            result.preview = data.slice(0, 2);
          } else if (typeof data === 'object' && data !== null) {
            // For BCB/IBGE APIs that return objects with arrays
            const keys = Object.keys(data);
            if (keys.length > 0 && Array.isArray(data[keys[0]])) {
              result.preview = data[keys[0]].slice(0, 2);
            } else {
              // Just show the object structure
              result.preview = [data];
            }
          } else {
            result.preview = [{ value: data }];
          }
          
          result.success = true;
          console.log(`[TEST-API] JSON parsed successfully, preview items: ${result.preview?.length}`);
        } catch (parseError) {
          // Response is not JSON
          result.error = 'Response is not valid JSON';
          result.preview = [{ raw: text.substring(0, 200) + (text.length > 200 ? '...' : '') }];
          console.log(`[TEST-API] Response is not JSON: ${parseError}`);
        }
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        console.log(`[TEST-API] HTTP error: ${result.error}`);
      }
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const endTime = performance.now();
      result.latencyMs = Math.round(endTime - startTime);

      const err = fetchError as Error;
      if (err.name === 'AbortError') {
        result.timeout = true;
        result.error = 'Connection timeout (10s exceeded)';
        console.log(`[TEST-API] Timeout after ${result.latencyMs}ms`);
      } else {
        result.error = err.message || 'Network error';
        console.log(`[TEST-API] Fetch error: ${err.message}`);
      }
    }

    // Update database with test results including new telemetry columns
    const newStatus = result.success ? 'active' : 'error';
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      last_checked_at: new Date().toISOString(),
      last_latency_ms: result.latencyMs,
      last_http_status: result.statusCode,
    };

    // Include sync metadata if available
    if (result.syncMetadata) {
      updatePayload.last_sync_metadata = result.syncMetadata;
    }

    const { error: updateError } = await supabase
      .from('system_api_registry')
      .update(updatePayload)
      .eq('id', apiId);

    if (updateError) {
      console.error(`[TEST-API] Database update error:`, updateError);
    } else {
      console.log(`[TEST-API] Updated API status to: ${newStatus}, with telemetry data`);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[TEST-API] Unexpected error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || 'Internal server error',
        latencyMs: 0,
        statusCode: null,
        statusText: '',
        contentType: null,
        preview: null,
        timeout: false,
        syncMetadata: null,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
