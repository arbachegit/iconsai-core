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
  fetch_start_date: string | null;
  fetch_end_date: string | null;
}

interface SyncMetadata {
  extracted_count: number;
  period_start: string | null;
  period_end: string | null;
  fields_detected: string[];
  last_record_value: string | null;
  fetch_timestamp: string;
}

// BCB-specific headers to avoid 406 errors
const BCB_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'identity',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

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

// Generate 10-year chunks from configured date range
function generateTenYearChunks(startDate: Date, endDate: Date): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  const currentStart = new Date(startDate);
  
  while (currentStart < endDate) {
    const chunkEnd = new Date(currentStart);
    chunkEnd.setFullYear(chunkEnd.getFullYear() + 10);
    chunkEnd.setDate(chunkEnd.getDate() - 1); // Last day of 10-year period
    
    const effectiveEnd = chunkEnd > endDate ? endDate : chunkEnd;
    
    chunks.push({
      start: formatDateBCB(currentStart),
      end: formatDateBCB(effectiveEnd)
    });
    
    // Move to next chunk
    currentStart.setFullYear(currentStart.getFullYear() + 10);
  }
  
  return chunks;
}

// Fetch BCB data with chunking to respect 10-year limit - NOW USING CONFIGURED DATES
// Enhanced with retry logic and detailed error tracking
async function fetchBCBWithChunking(
  baseUrl: string, 
  fetchStartDate: string | null, 
  fetchEndDate: string | null,
  indicatorName: string = 'Unknown'
): Promise<BCBDataPoint[]> {
  const allData: BCBDataPoint[] = [];
  const MAX_RETRIES = 3;
  
  // Remove any existing date parameters from URL
  const cleanUrl = baseUrl.split('&dataInicial')[0].split('?dataInicial')[0];
  const hasParams = cleanUrl.includes('?');
  
  // Use configured dates or fallback to defaults
  const startDate = fetchStartDate ? new Date(fetchStartDate) : new Date('2010-01-01');
  const endDate = fetchEndDate ? new Date(fetchEndDate) : new Date();
  
  console.log(`[FETCH-ECONOMIC] ====== AUDIT: ${indicatorName} ======`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Base URL: ${cleanUrl}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Configured fetch_start_date: ${fetchStartDate}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Configured fetch_end_date: ${fetchEndDate}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Effective start: ${startDate.toISOString().substring(0, 10)}`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Effective end: ${endDate.toISOString().substring(0, 10)}`);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] INVALID DATES! Start: ${fetchStartDate}, End: ${fetchEndDate}`);
    return [];
  }
  
  if (startDate >= endDate) {
    console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] START DATE >= END DATE! No data to fetch.`);
    return [];
  }
  
  // Generate dynamic chunks based on configured dates
  const chunks = generateTenYearChunks(startDate, endDate);
  
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] BCB chunking: ${chunks.length} chunks to fetch`);
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] Chunks:`, JSON.stringify(chunks));
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const separator = hasParams ? '&' : '?';
    const chunkUrl = `${cleanUrl}${separator}dataInicial=${chunk.start}&dataFinal=${chunk.end}`;
    
    console.log(`[FETCH-ECONOMIC] [${indicatorName}] Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);
    
    let lastError: Error | null = null;
    
    // Retry loop for each chunk
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[FETCH-ECONOMIC] [${indicatorName}] Attempt ${attempt}/${MAX_RETRIES} - Fetching: ${chunkUrl}`);
        
        const response = await fetch(chunkUrl, { headers: BCB_HEADERS });
        
        console.log(`[FETCH-ECONOMIC] [${indicatorName}] HTTP Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read response body');
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] HTTP ERROR ${response.status}: ${errorText.substring(0, 200)}`);
          
          if (response.status === 406) {
            console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] 406 Not Acceptable - BCB API rejecting request. Check date range or series code.`);
          }
          
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          
          if (attempt < MAX_RETRIES) {
            const delay = 5000 * attempt; // 5s, 10s, 15s exponential backoff for BCB resilience
            console.log(`[FETCH-ECONOMIC] [${indicatorName}] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break;
        }
        
        const responseText = await response.text();
        
        // Validate JSON response
        let data: BCBDataPoint[];
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] JSON PARSE ERROR:`, parseError);
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] Response preview: ${responseText.substring(0, 500)}`);
          lastError = new Error('Invalid JSON response from BCB');
          break;
        }
        
        // Validate data structure
        if (!Array.isArray(data)) {
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] UNEXPECTED FORMAT: Response is not an array`);
          console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] Response type: ${typeof data}`);
          lastError = new Error('BCB response is not an array');
          break;
        }
        
        // Validate data points have expected fields
        if (data.length > 0) {
          const sample = data[0];
          if (!('data' in sample) || !('valor' in sample)) {
            console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] UNEXPECTED FIELDS: Expected {data, valor}, got ${JSON.stringify(Object.keys(sample))}`);
          }
        }
        
        allData.push(...data);
        console.log(`[FETCH-ECONOMIC] ✅ [${indicatorName}] Chunk ${chunkIndex + 1} success: ${data.length} records (Total: ${allData.length})`);
        lastError = null;
        break; // Success, exit retry loop
        
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] FETCH EXCEPTION on attempt ${attempt}:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < MAX_RETRIES) {
          const delay = 5000 * attempt; // 5s, 10s, 15s exponential backoff
          console.log(`[FETCH-ECONOMIC] [${indicatorName}] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (lastError) {
      console.error(`[FETCH-ECONOMIC] ❌ [${indicatorName}] CHUNK ${chunkIndex + 1} FAILED after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }
    
    // Small delay between chunks to be polite to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`[FETCH-ECONOMIC] [${indicatorName}] ====== TOTAL RECORDS: ${allData.length} ======`);
  
  if (allData.length === 0) {
    console.warn(`[FETCH-ECONOMIC] ⚠️ [${indicatorName}] WARNING: ZERO DATA POINTS FETCHED!`);
    console.warn(`[FETCH-ECONOMIC] ⚠️ [${indicatorName}] Check: 1) Series code in URL, 2) Date range validity, 3) API availability`);
  }
  
  return allData;
}

// Generate sync metadata from fetched data
function generateSyncMetadata(data: BCBDataPoint[], provider: string): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: [],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!data || data.length === 0) return metadata;

  metadata.extracted_count = data.length;
  
  if (provider === 'BCB' && data[0].data && data[0].valor) {
    metadata.fields_detected = ['data', 'valor'];
    
    // Sort dates to find range
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(bcbDateToISO(a.data));
      const dateB = new Date(bcbDateToISO(b.data));
      return dateA.getTime() - dateB.getTime();
    });
    
    metadata.period_start = bcbDateToISO(sortedData[0].data);
    metadata.period_end = bcbDateToISO(sortedData[sortedData.length - 1].data);
    metadata.last_record_value = sortedData[sortedData.length - 1].valor;
  }

  return metadata;
}

// Generate sync metadata for IBGE data
function generateIBGESyncMetadata(ibgeData: IBGEResult[]): SyncMetadata {
  const metadata: SyncMetadata = {
    extracted_count: 0,
    period_start: null,
    period_end: null,
    fields_detected: ['D2C', 'V', 'variavel', 'unidade'],
    last_record_value: null,
    fetch_timestamp: new Date().toISOString()
  };

  if (!ibgeData || ibgeData.length === 0 || !ibgeData[0].resultados) return metadata;

  const allPeriods: string[] = [];
  let totalCount = 0;
  let lastValue: string | null = null;

  for (const resultado of ibgeData[0].resultados) {
    for (const serie of resultado.series || []) {
      const serieData = serie.serie || {};
      for (const [period, value] of Object.entries(serieData)) {
        if (value && value !== '-' && value !== '...') {
          allPeriods.push(period);
          totalCount++;
          lastValue = value;
        }
      }
    }
  }

  metadata.extracted_count = totalCount;
  
  if (allPeriods.length > 0) {
    allPeriods.sort();
    const formatPeriod = (p: string) => {
      if (p.length === 6) return `${p.substring(0, 4)}-${p.substring(4, 6)}-01`;
      return `${p}-01-01`;
    };
    metadata.period_start = formatPeriod(allPeriods[0]);
    metadata.period_end = formatPeriod(allPeriods[allPeriods.length - 1]);
    metadata.last_record_value = lastValue;
  }

  return metadata;
}

// Generate ANNUAL chunks for IBGE API (YYYYMM format) to prevent HTTP 500 errors
function generateIBGEYearChunks(startDate: Date, endDate: Date): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let currentYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  
  while (currentYear <= endYear) {
    // ANNUAL chunks (1 year each) to prevent HTTP 500 from IBGE server overload
    const chunkEndYear = Math.min(currentYear, endYear);
    
    // Format: YYYYMM
    const chunkStart = `${currentYear}01`;
    const chunkEnd = chunkEndYear === endYear 
      ? `${chunkEndYear}${String(endMonth).padStart(2, '0')}` 
      : `${chunkEndYear}12`;
    
    chunks.push({ start: chunkStart, end: chunkEnd });
    currentYear = currentYear + 1;
  }
  
  return chunks;
}

// Fetch IBGE data with chunking to avoid HTTP 500 from server overload
async function fetchIBGEWithChunking(
  baseUrl: string, 
  fetchStartDate: string | null, 
  fetchEndDate: string | null,
  indicatorName: string = 'Unknown'
): Promise<IBGEResult[]> {
  const allData: IBGEResult[] = [];
  const MAX_RETRIES = 3;
  
  // Use configured dates or fallback to defaults
  const startDate = fetchStartDate ? new Date(fetchStartDate) : new Date('2012-01-01');
  const endDate = fetchEndDate ? new Date(fetchEndDate) : new Date();
  
  console.log(`[FETCH-ECONOMIC] ====== IBGE CHUNKING AUDIT: ${indicatorName} ======`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Base URL: ${baseUrl}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Configured fetch_start_date: ${fetchStartDate}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Configured fetch_end_date: ${fetchEndDate}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Effective start: ${startDate.toISOString().substring(0, 10)}`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Effective end: ${endDate.toISOString().substring(0, 10)}`);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] INVALID DATES! Start: ${fetchStartDate}, End: ${fetchEndDate}`);
    return [];
  }
  
  if (startDate >= endDate) {
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] START DATE >= END DATE! No data to fetch.`);
    return [];
  }
  
  // Generate 3-year chunks
  const chunks = generateIBGEYearChunks(startDate, endDate);
  
  console.log(`[FETCH-ECONOMIC] [IBGE] ${indicatorName} - chunking into ${chunks.length} ANNUAL periods`);
  console.log(`[FETCH-ECONOMIC] [IBGE] Chunks:`, JSON.stringify(chunks));
  
  // ========== UNIFIED URL PERIOD DETECTION ==========
  // Priority 1: Check for {PERIOD} placeholder (dynamic URL)
  const hasPlaceholder = baseUrl.includes('{PERIOD}');
  
  // Priority 2: Check for negative period (e.g., -120 = last 120 periods) - NO CHUNKING NEEDED
  const negativePeriodMatch = baseUrl.match(/\/periodos\/(-\d+)\//);
  
  // Priority 3: Check for fixed period format YYYYMM-YYYYMM
  const fixedPeriodRegex = /\/periodos\/(\d{6})-(\d{6})\//;
  const fixedPeriodMatch = baseUrl.match(fixedPeriodRegex);
  
  console.log(`[FETCH-ECONOMIC] [IBGE] URL Analysis:`);
  console.log(`[FETCH-ECONOMIC] [IBGE]   - Has {PERIOD} placeholder: ${hasPlaceholder}`);
  console.log(`[FETCH-ECONOMIC] [IBGE]   - Has negative period: ${negativePeriodMatch ? negativePeriodMatch[1] : 'NO'}`);
  console.log(`[FETCH-ECONOMIC] [IBGE]   - Has fixed period: ${fixedPeriodMatch ? `${fixedPeriodMatch[1]}-${fixedPeriodMatch[2]}` : 'NO'}`);
  
  // ========== HANDLE NEGATIVE PERIOD (NO CHUNKING) ==========
  if (negativePeriodMatch) {
    console.log(`[FETCH-ECONOMIC] [IBGE] 🔄 Negative period detected (${negativePeriodMatch[1]}) - fetching without chunking`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch(baseUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log(`[FETCH-ECONOMIC] [IBGE] HTTP Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[FETCH-ECONOMIC] ✅ [IBGE] Negative period fetch successful`);
        return data as IBGEResult[];
      } else {
        console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Negative period fetch failed: HTTP ${response.status}`);
        return [];
      }
    } catch (e) {
      console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Negative period fetch exception:`, e);
      return [];
    }
  }
  
  // ========== VALIDATE URL CAN BE CHUNKED ==========
  if (!hasPlaceholder && !fixedPeriodMatch) {
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Cannot chunk URL - no {PERIOD} placeholder or fixed period found`);
    console.error(`[FETCH-ECONOMIC] ❌ [IBGE] URL: ${baseUrl}`);
    // Fallback: try single request
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        const data = await response.json();
        return data as IBGEResult[];
      }
    } catch (e) {
      console.error(`[FETCH-ECONOMIC] ❌ [IBGE] Fallback fetch failed:`, e);
    }
    return [];
  }
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const periodFormat = `${chunk.start}-${chunk.end}`;
    
    // Build chunk URL based on detected pattern
    let chunkUrl: string;
    if (hasPlaceholder) {
      // Replace {PERIOD} placeholder with actual period
      chunkUrl = baseUrl.replace('{PERIOD}', periodFormat);
    } else {
      // Replace fixed period with chunk period
      chunkUrl = baseUrl.replace(fixedPeriodRegex, `/periodos/${periodFormat}/`);
    }
    
    console.log(`[FETCH-ECONOMIC] [IBGE] 📤 Chunk URL: ${chunkUrl.substring(0, 180)}...`);
    
    console.log(`[FETCH-ECONOMIC] [IBGE] Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);
    
    let lastError: Error | null = null;
    
    // Retry loop for each chunk
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[FETCH-ECONOMIC] [IBGE] Attempt ${attempt}/${MAX_RETRIES} - Fetching: ${chunkUrl.substring(0, 150)}...`);
        
        const response = await fetch(chunkUrl);
        
        console.log(`[FETCH-ECONOMIC] [IBGE] HTTP Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read response body');
          console.error(`[FETCH-ECONOMIC] ❌ [IBGE] HTTP ERROR ${response.status}: ${errorText.substring(0, 200)}`);
          
          if (response.status === 500) {
            console.error(`[FETCH-ECONOMIC] ❌ [IBGE] 500 Internal Server Error - IBGE server overloaded. Reducing chunk size may help.`);
          }
          
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          
          if (attempt < MAX_RETRIES) {
            const delay = 3000 * attempt; // 3s, 6s, 9s exponential backoff for IBGE resilience
            console.log(`[FETCH-ECONOMIC] [IBGE] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break;
        }
        
        const data = await response.json() as IBGEResult[];
        
        if (Array.isArray(data) && data.length > 0) {
          allData.push(...data);
          
          // Count records in this chunk
          let chunkRecords = 0;
          if (data[0]?.resultados) {
            for (const resultado of data[0].resultados) {
              for (const serie of resultado.series || []) {
                const serieData = serie.serie || {};
                chunkRecords += Object.keys(serieData).length;
              }
            }
          }
          
          console.log(`[FETCH-ECONOMIC] ✅ [IBGE] Chunk ${chunkIndex + 1} success: ${chunkRecords} records`);
        } else {
          console.log(`[FETCH-ECONOMIC] ⚠️ [IBGE] Chunk ${chunkIndex + 1} returned empty data`);
        }
        
        lastError = null;
        break; // Success, exit retry loop
        
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] ❌ [IBGE] FETCH EXCEPTION on attempt ${attempt}:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < MAX_RETRIES) {
          const delay = 3000 * attempt; // 3s, 6s, 9s exponential backoff
          console.log(`[FETCH-ECONOMIC] [IBGE] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (lastError) {
      console.error(`[FETCH-ECONOMIC] ❌ [IBGE] CHUNK ${chunkIndex + 1} FAILED after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }
    
    // Longer delay between chunks for IBGE (1.5s) for resilience and to avoid rate limiting
    if (chunkIndex < chunks.length - 1) {
      console.log(`[FETCH-ECONOMIC] [IBGE] Waiting 1500ms before next chunk...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log(`[FETCH-ECONOMIC] [IBGE] ${indicatorName} ====== TOTAL CHUNKS FETCHED: ${allData.length} ======`);
  
  if (allData.length === 0) {
    console.warn(`[FETCH-ECONOMIC] ⚠️ [IBGE] WARNING: ZERO DATA CHUNKS FETCHED!`);
    console.warn(`[FETCH-ECONOMIC] ⚠️ [IBGE] Check: 1) URL format, 2) Date range validity, 3) IBGE API availability`);
  }
  
  // Merge results - IBGE returns array with single element containing nested resultados
  // We need to merge all chunks into a single coherent structure
  if (allData.length === 0) return [];
  if (allData.length === 1) return allData;
  
  // Merge multiple IBGE responses into one
  const mergedResult: IBGEResult = {
    id: allData[0].id,
    variavel: allData[0].variavel,
    unidade: allData[0].unidade,
    resultados: []
  };
  
  // Merge all series data
  const mergedSerieData: Record<string, string> = {};
  
  for (const ibgeResult of allData) {
    if (!ibgeResult.resultados) continue;
    for (const resultado of ibgeResult.resultados) {
      for (const serie of resultado.series || []) {
        const serieData = serie.serie || {};
        for (const [period, value] of Object.entries(serieData)) {
          if (value && value !== '-' && value !== '...') {
            mergedSerieData[period] = value;
          }
        }
      }
    }
  }
  
  // Reconstruct merged result
  if (allData[0].resultados && allData[0].resultados[0]) {
    const templateResultado = allData[0].resultados[0];
    mergedResult.resultados = [{
      classificacoes: templateResultado.classificacoes,
      series: [{
        localidade: templateResultado.series[0]?.localidade || { id: '', nivel: { id: '', nome: '' }, nome: '' },
        serie: mergedSerieData
      }]
    }];
  }
  
  console.log(`[FETCH-ECONOMIC] [IBGE] Merged ${Object.keys(mergedSerieData).length} total periods from ${allData.length} chunks`);
  
  return [mergedResult];
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

    const requestBody = await req.json().catch(() => ({}));
    const { indicatorId, fetchAll, forceRefresh, autoMode } = requestBody;

    console.log('[FETCH-ECONOMIC] ====== REQUEST RECEIVED ======');
    console.log('[FETCH-ECONOMIC] Raw request body:', JSON.stringify(requestBody));
    console.log('[FETCH-ECONOMIC] Parsed parameters:', { indicatorId, fetchAll, forceRefresh, autoMode });
    console.log('[FETCH-ECONOMIC] forceRefresh type:', typeof forceRefresh);
    console.log('[FETCH-ECONOMIC] forceRefresh === true:', forceRefresh === true);

    // Get indicators to fetch
    let indicatorsQuery = supabase
      .from('economic_indicators')
      .select(`id, name, code, unit, api_id, system_api_registry!inner (id, name, provider, base_url, status, fetch_start_date, fetch_end_date)`)
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

    // ====== FORCE REFRESH: Zero-Base Sync with VERIFICATION ======
    let zeroBaseExecuted = false;
    let totalDeleted = 0;
    
    if (forceRefresh === true) {
      console.log('[FETCH-ECONOMIC] ☢️☢️☢️ FORCE REFRESH MODE: Nuclear Zero-Base Sync ☢️☢️☢️');
      console.log('[FETCH-ECONOMIC] forceRefresh is TRUE - executing Zero-Base cleanup');
      console.log('[FETCH-ECONOMIC] Phase 1: Counting records BEFORE deletion...');
      
      zeroBaseExecuted = true;
      
      for (const indicator of indicators) {
        // Step 1: Count records BEFORE delete
        const { count: beforeCount, error: countError } = await supabase
          .from('indicator_values')
          .select('*', { count: 'exact', head: true })
          .eq('indicator_id', indicator.id);
        
        if (countError) {
          console.error(`[FETCH-ECONOMIC] ❌ Count failed for ${indicator.name}:`, countError);
          continue;
        }
        
        console.log(`[FETCH-ECONOMIC] ☢️ ${indicator.name}: ${beforeCount ?? 0} records BEFORE delete`);
        
        // Step 2: Execute DELETE with count confirmation
        console.log(`[FETCH-ECONOMIC] ☢️ Executing DELETE for: ${indicator.name} (${indicator.id})`);
        
        const { error: deleteError, count: deletedCount } = await supabase
          .from('indicator_values')
          .delete({ count: 'exact' })
          .eq('indicator_id', indicator.id);
        
        if (deleteError) {
          console.error(`[FETCH-ECONOMIC] ❌ DELETE FAILED for ${indicator.name}:`, deleteError);
          console.error(`[FETCH-ECONOMIC] Error code: ${deleteError.code}`);
          console.error(`[FETCH-ECONOMIC] Error message: ${deleteError.message}`);
          throw new Error(`Zero-Base DELETE failed for ${indicator.name}: ${deleteError.message}`);
        }
        
        totalDeleted += deletedCount ?? 0;
        console.log(`[FETCH-ECONOMIC] ✅ DELETED ${deletedCount ?? 'confirmed'} records for ${indicator.name} (Running total: ${totalDeleted})`);
        
        // Step 3: VERIFY table is truly empty
        const { count: afterCount, error: verifyError } = await supabase
          .from('indicator_values')
          .select('*', { count: 'exact', head: true })
          .eq('indicator_id', indicator.id);
        
        if (verifyError) {
          console.error(`[FETCH-ECONOMIC] ❌ Verification failed for ${indicator.name}:`, verifyError);
          throw new Error(`Zero-Base verification failed for ${indicator.name}`);
        }
        
        if (afterCount && afterCount > 0) {
          console.error(`[FETCH-ECONOMIC] ❌ CRITICAL: ${afterCount} records STILL EXIST after DELETE!`);
          throw new Error(`Zero-Base incomplete: ${afterCount} records remain for ${indicator.name}`);
        }
        
        console.log(`[FETCH-ECONOMIC] ✅ VERIFIED: ${indicator.name} table is EMPTY (0 records)`);
      }
      
      console.log(`[FETCH-ECONOMIC] ☢️☢️☢️ Zero-Base cleanup COMPLETE. Total deleted: ${totalDeleted}. All tables verified EMPTY. ☢️☢️☢️`);
      console.log('[FETCH-ECONOMIC] Proceeding with fresh data insertion...');
    } else {
      console.log('[FETCH-ECONOMIC] forceRefresh is NOT true - skipping Zero-Base cleanup');
      console.log('[FETCH-ECONOMIC] forceRefresh value:', forceRefresh);
    }

    let totalRecordsInserted = 0;
    let newRecordsCount = 0;
    const results: Array<{ indicator: string; records: number; status: string; newRecords: number }> = [];

    for (const indicator of indicators) {
      try {
        const apiConfigRaw = indicator.system_api_registry;
        if (!apiConfigRaw) continue;
        
        // Handle both array and object cases from Supabase
        const apiConfig: ApiConfig = Array.isArray(apiConfigRaw) ? apiConfigRaw[0] : apiConfigRaw;
        if (!apiConfig) continue;

        console.log(`[FETCH-ECONOMIC] Fetching ${indicator.name} from ${apiConfig.provider}...`);
        console.log(`[FETCH-ECONOMIC] Base URL: ${apiConfig.base_url}`);

        let data: unknown;
        let syncMetadata: SyncMetadata | null = null;
        let httpStatus: number | null = null;
        
        // ====== AUTO MODE: Calculate dynamic start date ======
        let effectiveStartDate = apiConfig.fetch_start_date;
        
        if (autoMode && !forceRefresh) {
          console.log(`[FETCH-ECONOMIC] [AUTO MODE] Calculating dynamic start date for ${indicator.name}`);
          
          const { data: lastRecord, error: lastRecordError } = await supabase
            .from('indicator_values')
            .select('reference_date')
            .eq('indicator_id', indicator.id)
            .order('reference_date', { ascending: false })
            .limit(1)
            .single();
          
          if (lastRecord && !lastRecordError) {
            const lastDate = new Date(lastRecord.reference_date);
            lastDate.setDate(lastDate.getDate() + 1);
            effectiveStartDate = lastDate.toISOString().substring(0, 10);
            console.log(`[FETCH-ECONOMIC] [AUTO MODE] Last record: ${lastRecord.reference_date}, starting from: ${effectiveStartDate}`);
          } else {
            console.log(`[FETCH-ECONOMIC] [AUTO MODE] No existing records, using configured start: ${effectiveStartDate}`);
          }
          
          // Update last_auto_fetch timestamp
          await supabase.from('system_api_registry').update({
            last_auto_fetch: new Date().toISOString()
          }).eq('id', apiConfig.id);
        }

        // Use chunking strategy for BCB to avoid 10-year limit (406 error)
        // NOW PASSING CONFIGURED DATES FROM DATABASE
        if (apiConfig.provider === 'BCB') {
          console.log(`[FETCH-ECONOMIC] 🔄 Starting BCB fetch for: ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] Using dates for ${indicator.name}: ${effectiveStartDate} to ${apiConfig.fetch_end_date}`);
          const bcbData = await fetchBCBWithChunking(apiConfig.base_url, effectiveStartDate, apiConfig.fetch_end_date, indicator.name);
          data = bcbData;
          syncMetadata = generateSyncMetadata(bcbData, 'BCB');
          httpStatus = bcbData.length > 0 ? 200 : null;
          console.log(`[FETCH-ECONOMIC] 📊 BCB fetch complete for ${indicator.name}: ${bcbData.length} data points`);
        } else if (apiConfig.provider === 'IBGE') {
          // IBGE: Use chunking to avoid HTTP 500 from server overload
          console.log(`[FETCH-ECONOMIC] 🔄 Starting IBGE fetch with chunking for: ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] Using dates for ${indicator.name}: ${effectiveStartDate} to ${apiConfig.fetch_end_date}`);
          const ibgeData = await fetchIBGEWithChunking(apiConfig.base_url, effectiveStartDate, apiConfig.fetch_end_date, indicator.name);
          data = ibgeData;
          syncMetadata = generateIBGESyncMetadata(ibgeData);
          httpStatus = ibgeData.length > 0 ? 200 : null;
          console.log(`[FETCH-ECONOMIC] 📊 IBGE fetch complete for ${indicator.name}: ${ibgeData.length} result chunks`);
        } else {
          // Other providers: standard fetch
          const response = await fetch(apiConfig.base_url);
          httpStatus = response.status;
          
          if (!response.ok) {
            console.error(`[FETCH-ECONOMIC] API error for ${indicator.name}: ${response.status}`);
            
            // Update API registry with error status
            await supabase.from('system_api_registry').update({
              status: 'error',
              last_checked_at: new Date().toISOString(),
              last_http_status: response.status,
              last_sync_metadata: {
                extracted_count: 0,
                period_start: null,
                period_end: null,
                fields_detected: [],
                last_record_value: null,
                fetch_timestamp: new Date().toISOString(),
                error: `HTTP ${response.status}`
              }
            }).eq('id', apiConfig.id);
            
            results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
            continue;
          }
          data = await response.json();
        }

        let valuesToInsert: Array<{ indicator_id: string; reference_date: string; value: number }> = [];

        if (apiConfig.provider === 'BCB') {
          // BCB returns array of {data: "DD/MM/YYYY", valor: "X.XX"}
          const bcbData = data as BCBDataPoint[];
          console.log(`[FETCH-ECONOMIC] BCB data points received: ${bcbData.length}`);
          
          valuesToInsert = bcbData.map((item) => {
            const [day, month, year] = item.data.split('/');
            return {
              indicator_id: indicator.id,
              reference_date: `${year}-${month}-${day}`,
              value: parseFloat(item.valor.replace(',', '.')),
            };
          }).filter(v => !isNaN(v.value));
          
        } else if (apiConfig.provider === 'IBGE') {
          // IBGE SIDRA returns complex nested structure
          const ibgeData = data as IBGEResult[];
          console.log(`[FETCH-ECONOMIC] IBGE response received, parsing...`);
          
          if (ibgeData.length > 0 && ibgeData[0].resultados) {
            const resultados = ibgeData[0].resultados;
            
            // Handle multiple series (e.g., when there are classification filters)
            for (const resultado of resultados) {
              const series = resultado.series;
              if (series && series.length > 0) {
                for (const serie of series) {
                  const serieData = serie.serie || {};
                  
                  for (const [period, value] of Object.entries(serieData)) {
                    if (!value || value === '-' || value === '...') continue;
                    
                    let refDate: string;
                    // IBGE period formats: YYYYMM (monthly), YYYY (annual), YYYYQN (quarterly)
                    if (period.length === 6) {
                      // Monthly: YYYYMM -> YYYY-MM-01
                      refDate = `${period.substring(0, 4)}-${period.substring(4, 6)}-01`;
                    } else if (period.length === 4) {
                      // Annual: YYYY -> YYYY-01-01
                      refDate = `${period}-01-01`;
                    } else if (period.length === 5 && period.includes('Q')) {
                      // Quarterly: YYYYQN -> approximate to quarter start
                      const year = period.substring(0, 4);
                      const quarter = parseInt(period.substring(5));
                      const month = ((quarter - 1) * 3 + 1).toString().padStart(2, '0');
                      refDate = `${year}-${month}-01`;
                    } else {
                      refDate = `${period}-01-01`;
                    }
                    
                    const numValue = parseFloat(value.replace(',', '.'));
                    if (!isNaN(numValue)) {
                      valuesToInsert.push({
                        indicator_id: indicator.id,
                        reference_date: refDate,
                        value: numValue,
                      });
                    }
                  }
                }
              }
            }
          }
          
          console.log(`[FETCH-ECONOMIC] IBGE parsed values: ${valuesToInsert.length}`);
        }

        // ====== ZERO VALUES WARNING ======
        if (valuesToInsert.length === 0) {
          console.warn(`[FETCH-ECONOMIC] ⚠️ ZERO VALUES WARNING: ${indicator.name}`);
          console.warn(`[FETCH-ECONOMIC] Provider: ${apiConfig.provider}`);
          console.warn(`[FETCH-ECONOMIC] Configured dates: ${apiConfig.fetch_start_date} to ${apiConfig.fetch_end_date}`);
          console.warn(`[FETCH-ECONOMIC] Base URL: ${apiConfig.base_url}`);
          console.warn(`[FETCH-ECONOMIC] Check if ${apiConfig.provider} API has data for this period`);
          console.warn(`[FETCH-ECONOMIC] Possible causes: 1) Wrong date format 2) API limit 3) No data in period`);
          results.push({ indicator: indicator.name, records: 0, status: 'no_data', newRecords: 0 });
          continue;
        }

        // Check for existing records to detect NEW data
        const { data: existingRecords } = await supabase
          .from('indicator_values')
          .select('reference_date')
          .eq('indicator_id', indicator.id);

        const existingDates = new Set((existingRecords || []).map(r => r.reference_date));
        const newValues = valuesToInsert.filter(v => !existingDates.has(v.reference_date));

        console.log(`[FETCH-ECONOMIC] ${indicator.name}: ${valuesToInsert.length} total, ${newValues.length} NEW records`);

        // Execute upsert with detailed audit logging
        console.log(`[FETCH-ECONOMIC] ====== UPSERT AUDIT START: ${indicator.name} ======`);
        console.log(`[FETCH-ECONOMIC] Attempting upsert of ${valuesToInsert.length} records`);
        console.log(`[FETCH-ECONOMIC] Date range: ${valuesToInsert[0]?.reference_date} to ${valuesToInsert[valuesToInsert.length - 1]?.reference_date}`);
        
        const { error: insertError, count: upsertCount } = await supabase
          .from('indicator_values')
          .upsert(valuesToInsert, { 
            onConflict: 'indicator_id,reference_date', 
            ignoreDuplicates: false,
            count: 'exact'
          });

        if (insertError) {
          console.error(`[FETCH-ECONOMIC] ❌ UPSERT FAILED for ${indicator.name}:`, insertError);
          console.error(`[FETCH-ECONOMIC] Error code: ${insertError.code}`);
          console.error(`[FETCH-ECONOMIC] Error message: ${insertError.message}`);
          console.error(`[FETCH-ECONOMIC] Error details: ${insertError.details}`);
          results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
        } else {
          console.log(`[FETCH-ECONOMIC] ✅ UPSERT SUCCESS: ${upsertCount ?? valuesToInsert.length} records persisted for ${indicator.name}`);
          console.log(`[FETCH-ECONOMIC] ====== UPSERT AUDIT END ======`);
          totalRecordsInserted += valuesToInsert.length;
          newRecordsCount += newValues.length;
          results.push({ 
            indicator: indicator.name, 
            records: valuesToInsert.length, 
            status: 'success',
            newRecords: newValues.length
          });

          // ====== GOVERNANCE: Validate Start Date ======
          if (valuesToInsert.length > 0) {
            const sortedValues = [...valuesToInsert].sort((a, b) => 
              a.reference_date.localeCompare(b.reference_date)
            );
            
            const firstInsertedDate = sortedValues[0].reference_date;
            const configuredStart = apiConfig.fetch_start_date;
            
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] First inserted date: ${firstInsertedDate}`);
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] Configured start: ${configuredStart}`);
            
            if (configuredStart) {
              const insertedDate = new Date(firstInsertedDate);
              const configuredDate = new Date(configuredStart);
              const diffDays = Math.abs((insertedDate.getTime() - configuredDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays > 30) {
                console.warn(`[FETCH-ECONOMIC] ⚠️ [GOVERNANCE] DATA GAP DETECTED!`);
                console.warn(`[FETCH-ECONOMIC] Expected start: ${configuredStart}`);
                console.warn(`[FETCH-ECONOMIC] Actual start: ${firstInsertedDate}`);
                console.warn(`[FETCH-ECONOMIC] Gap: ${Math.round(diffDays)} days`);
                
                // Log governance alert
                await supabase.from('user_activity_logs').insert({
                  user_email: 'system@knowyou.app',
                  action_category: 'GOVERNANCE_ALERT',
                  action: `Data gap detected for ${indicator.name}`,
                  details: { 
                    indicator: indicator.name,
                    configuredStart,
                    actualStart: firstInsertedDate,
                    gapDays: Math.round(diffDays),
                    severity: diffDays > 365 ? 'critical' : 'warning'
                  }
                });
              } else {
                console.log(`[FETCH-ECONOMIC] ✅ [GOVERNANCE] Date validation PASSED (${Math.round(diffDays)} days within 30-day tolerance)`);
              }
              
              // ====== AUTO-ADJUSTMENT: Update fetch_start_date if API history is limited ======
              if (diffDays > 365 && insertedDate > configuredDate) {
                console.log(`[FETCH-ECONOMIC] ⚠️ AUTO-ADJUSTMENT: API history limited. Configured: ${configuredStart}, Actual: ${firstInsertedDate}`);
                console.log(`[FETCH-ECONOMIC] ⚠️ Difference: ${Math.round(diffDays)} days. Updating fetch_start_date to match actual API availability.`);
                
                const { error: adjustError } = await supabase
                  .from('system_api_registry')
                  .update({ 
                    fetch_start_date: firstInsertedDate
                  })
                  .eq('id', apiConfig.id);
                
                if (adjustError) {
                  console.error(`[FETCH-ECONOMIC] ❌ Auto-adjustment failed:`, adjustError);
                } else {
                  console.log(`[FETCH-ECONOMIC] ✅ Auto-adjusted fetch_start_date to ${firstInsertedDate}`);
                }
              }
            }
          }

          // Update API registry with success telemetry AND discovered period
          const registryUpdate: Record<string, unknown> = {
            status: 'active',
            last_checked_at: new Date().toISOString(),
            last_http_status: httpStatus,
            last_sync_metadata: syncMetadata
          };

          // Persist discovered period (governance feature)
          if (syncMetadata?.period_start) {
            registryUpdate.discovered_period_start = syncMetadata.period_start;
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] Persisting discovered_period_start: ${syncMetadata.period_start}`);
          }
          if (syncMetadata?.period_end) {
            registryUpdate.discovered_period_end = syncMetadata.period_end;
            console.log(`[FETCH-ECONOMIC] [GOVERNANCE] Persisting discovered_period_end: ${syncMetadata.period_end}`);
          }
          if (syncMetadata?.period_start || syncMetadata?.period_end) {
            registryUpdate.period_discovery_date = new Date().toISOString();
          }

          await supabase.from('system_api_registry').update(registryUpdate).eq('id', apiConfig.id);

          // If NEW records were inserted, dispatch notification
          if (newValues.length > 0) {
            const latestValue = valuesToInsert[valuesToInsert.length - 1];
            console.log(`[FETCH-ECONOMIC] NEW data detected for ${indicator.name}: ${newValues.length} records`);
            
            // Dispatch notification for new economic data
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  eventType: 'new_economic_data',
                  to: null, // Will use admin settings
                  subject: `Novo indicador disponível: ${indicator.name}`,
                  body: `Novo indicador disponível: ${indicator.name} referente a ${latestValue.reference_date}. Valor: ${latestValue.value}${indicator.unit ? ` ${indicator.unit}` : ''}.`
                }
              });
              console.log(`[FETCH-ECONOMIC] Notification dispatched for ${indicator.name}`);
            } catch (notifyError) {
              console.error('[FETCH-ECONOMIC] Notification error:', notifyError);
            }
          }
        }
      } catch (err) {
        console.error(`[FETCH-ECONOMIC] Error processing ${indicator.name}:`, err);
        results.push({ indicator: indicator.name, records: 0, status: 'error', newRecords: 0 });
      }
    }

    // Audit log
    await supabase.from('user_activity_logs').insert({
      user_email: 'system@knowyou.app',
      action_category: 'ECONOMIC_DATA_FETCH',
      action: `Fetched economic data | Total: ${totalRecordsInserted} | New: ${newRecordsCount}`,
      details: { results, totalRecordsInserted, newRecordsCount }
    });

    console.log(`[FETCH-ECONOMIC] Complete. Total: ${totalRecordsInserted}, New: ${newRecordsCount}`);

    const responsePayload = { 
      success: true, 
      recordsInserted: totalRecordsInserted, 
      newRecordsCount, 
      results,
      zeroBaseExecuted,
      totalDeleted
    };
    
    console.log('[FETCH-ECONOMIC] ====== FINAL RESPONSE ======');
    console.log('[FETCH-ECONOMIC] Response payload:', JSON.stringify(responsePayload));
    
    return new Response(
      JSON.stringify(responsePayload),
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
