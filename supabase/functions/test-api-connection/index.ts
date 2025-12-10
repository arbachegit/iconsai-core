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
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Detect provider from URL
    const isBCB = baseUrl.includes('api.bcb.gov.br');
    const isIBGE = baseUrl.includes('servicodados.ibge.gov.br');

    // Dynamic headers based on provider
    const requestHeaders: Record<string, string> = {};
    
    if (isBCB) {
      // BCB API rejects Deno's default headers - override with browser-like headers
      requestHeaders['Accept'] = 'application/json, text/plain, */*';
      requestHeaders['Accept-Encoding'] = 'identity'; // No compression
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      console.log(`[TEST-API] BCB API detected - using browser-like headers to override Deno defaults`);
    } else if (isIBGE) {
      requestHeaders['Accept'] = 'application/json';
      requestHeaders['Accept-Encoding'] = 'identity';
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (compatible; KnowYOU/1.0)';
      console.log(`[TEST-API] IBGE API detected - using JSON Accept header`);
    } else {
      requestHeaders['Accept'] = '*/*';
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (compatible; KnowYOU/1.0)';
      console.log(`[TEST-API] Generic API - using standard headers`);
    }

    console.log(`[TEST-API] Request headers:`, requestHeaders);

    const startTime = performance.now();

    try {
      const fetchOptions: RequestInit = {
        method: 'GET',
        signal: controller.signal,
      };
      
      // Only add headers if we have any
      if (Object.keys(requestHeaders).length > 0) {
        fetchOptions.headers = requestHeaders;
      }

      const response = await fetch(baseUrl, fetchOptions);

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

    // Update database with test results
    const newStatus = result.success ? 'active' : 'error';
    const { error: updateError } = await supabase
      .from('system_api_registry')
      .update({
        status: newStatus,
        last_checked_at: new Date().toISOString(),
        last_latency_ms: result.latencyMs,
      })
      .eq('id', apiId);

    if (updateError) {
      console.error(`[TEST-API] Database update error:`, updateError);
    } else {
      console.log(`[TEST-API] Updated API status to: ${newStatus}`);
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
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
