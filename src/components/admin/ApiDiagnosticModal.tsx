import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface ApiRegistry {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  fetch_start_date: string | null;
  fetch_end_date: string | null;
}

interface ApiTestResult {
  apiId: string;
  apiName: string;
  provider: string;
  testResult: 'SIM' | 'NÃO' | 'PENDING';
  statusCode: number | null;
  latencyMs: number;
  firstDateFound: string | null;
  configuredStart: string | null;
  extractedCount: number | null;
  errorMessage: string | null;
  diagnosis: 'OK' | 'API_NO_HISTORY' | 'API_ERROR' | 'PENDING';
  diagnosisMessage: string | null;
}

interface ApiDiagnosticModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiDiagnosticModal({ open, onOpenChange }: ApiDiagnosticModalProps) {
  const [apis, setApis] = useState<ApiRegistry[]>([]);
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  // Fetch APIs when modal opens
  useEffect(() => {
    if (open && !hasRun) {
      fetchApis();
    }
  }, [open, hasRun]);

  const fetchApis = async () => {
    const { data, error } = await supabase
      .from('system_api_registry')
      .select('id, name, provider, base_url, fetch_start_date, fetch_end_date')
      .in('provider', ['BCB', 'IBGE'])
      .order('provider', { ascending: true });

    if (error) {
      console.error('[API_DIAGNOSTIC] Error fetching APIs:', error);
      return;
    }

    const apiList = (data || []) as ApiRegistry[];
    setApis(apiList);
    
    // Initialize results with PENDING status
    const initialResults: ApiTestResult[] = apiList.map(api => ({
      apiId: api.id,
      apiName: api.name,
      provider: api.provider,
      testResult: 'PENDING',
      statusCode: null,
      latencyMs: 0,
      firstDateFound: null,
      configuredStart: api.fetch_start_date?.substring(0, 10) || null,
      extractedCount: null,
      errorMessage: null,
      diagnosis: 'PENDING',
      diagnosisMessage: null
    }));
    
    setResults(initialResults);
    
    // Auto-start tests
    runTests(apiList, initialResults);
  };

  const runTests = useCallback(async (apiList: ApiRegistry[], initialResults: ApiTestResult[]) => {
    setIsRunning(true);
    setCurrentIndex(0);
    
    const updatedResults = [...initialResults];
    
    for (let i = 0; i < apiList.length; i++) {
      const api = apiList[i];
      setCurrentIndex(i + 1);
      
      console.log(`[API_DIAGNOSTIC] Testing ${i + 1}/${apiList.length}: ${api.name}`);
      
      try {
        const startTime = Date.now();
        
        const { data, error } = await supabase.functions.invoke('test-api-connection', {
          body: { apiId: api.id, baseUrl: api.base_url }
        });
        
        const latency = Date.now() - startTime;
        
        if (error) {
          updatedResults[i] = {
            ...updatedResults[i],
            testResult: 'NÃO',
            latencyMs: latency,
            errorMessage: error.message || 'Edge Function error',
            diagnosis: 'API_ERROR',
            diagnosisMessage: 'Erro ao chamar Edge Function'
          };
        } else if (data?.success) {
          const firstDate = data.syncMetadata?.period_start || null;
          const extractedCount = data.syncMetadata?.extracted_count || 0;
          const configStart = api.fetch_start_date?.substring(0, 10) || null;
          
          // Diagnose historical integrity
          let diagnosis: 'OK' | 'API_NO_HISTORY' = 'OK';
          let diagnosisMessage: string | null = null;
          
          if (configStart && firstDate) {
            const configDate = new Date(configStart);
            const actualDate = new Date(firstDate);
            const daysDiff = Math.floor((actualDate.getTime() - configDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 365) {
              const yearsDiff = Math.floor(daysDiff / 365);
              diagnosis = 'API_NO_HISTORY';
              diagnosisMessage = `API não possui dados antes de ${firstDate} (${yearsDiff} ano(s) após configurado)`;
            }
          }
          
          updatedResults[i] = {
            ...updatedResults[i],
            testResult: 'SIM',
            statusCode: data.statusCode || 200,
            latencyMs: data.latency || latency,
            firstDateFound: firstDate,
            extractedCount,
            errorMessage: null,
            diagnosis,
            diagnosisMessage
          };
        } else {
          updatedResults[i] = {
            ...updatedResults[i],
            testResult: 'NÃO',
            statusCode: data?.statusCode || null,
            latencyMs: data?.latency || latency,
            errorMessage: data?.error || 'API retornou erro',
            diagnosis: 'API_ERROR',
            diagnosisMessage: data?.error || 'Falha na resposta da API'
          };
        }
      } catch (err) {
        console.error(`[API_DIAGNOSTIC] Error testing ${api.name}:`, err);
        updatedResults[i] = {
          ...updatedResults[i],
          testResult: 'NÃO',
          errorMessage: err instanceof Error ? err.message : 'Erro desconhecido',
          diagnosis: 'API_ERROR',
          diagnosisMessage: 'Exceção durante teste'
        };
      }
      
      // Update results in real-time
      setResults([...updatedResults]);
      
      // Delay between requests to avoid rate limiting
      if (i < apiList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsRunning(false);
    setHasRun(true);
    console.log('[API_DIAGNOSTIC] All tests completed');
  }, []);

  const handleRetest = () => {
    setHasRun(false);
    fetchApis();
  };

  const handleClose = () => {
    setHasRun(false);
    setResults([]);
    setApis([]);
    onOpenChange(false);
  };

  const successCount = results.filter(r => r.testResult === 'SIM').length;
  const failCount = results.filter(r => r.testResult === 'NÃO').length;
  const historyWarnings = results.filter(r => r.diagnosis === 'API_NO_HISTORY').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Diagnóstico de APIs Externas
          </DialogTitle>
          <DialogDescription>
            Testando conectividade e integridade histórica de todas as APIs configuradas (BCB e IBGE)
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Testando {currentIndex} de {apis.length}...</span>
            </div>
            <Progress value={(currentIndex / apis.length) * 100} className="h-2" />
          </div>
        )}

        {/* Results Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[35%]">Nome da API</TableHead>
                <TableHead className="w-[15%] text-center">Resultado</TableHead>
                <TableHead className="w-[50%]">Detalhes / Primeira Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.apiId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 ${
                          result.provider === 'BCB' 
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                            : 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                        }`}
                      >
                        {result.provider}
                      </Badge>
                      <span className="font-medium text-sm">{result.apiName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {result.testResult === 'PENDING' && (
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                        <span className="text-xs text-muted-foreground">Aguardando</span>
                      </div>
                    )}
                    {result.testResult === 'SIM' && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        SIM
                      </Badge>
                    )}
                    {result.testResult === 'NÃO' && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        NÃO
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {result.testResult === 'PENDING' && (
                      <span className="text-sm text-muted-foreground italic">Aguardando teste...</span>
                    )}
                    {result.testResult === 'SIM' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-emerald-400">
                            Primeira Data: <span className="font-mono">{result.firstDateFound || 'N/A'}</span>
                          </span>
                          {result.diagnosis === 'API_NO_HISTORY' && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Histórico limitado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{result.extractedCount?.toLocaleString() || 0} registros</span>
                          <span>{result.latencyMs}ms</span>
                          {result.configuredStart && (
                            <span className="text-[10px]">Config: {result.configuredStart}</span>
                          )}
                        </div>
                        {result.diagnosisMessage && (
                          <div className="text-xs text-amber-400 mt-1">
                            ⚠ {result.diagnosisMessage}
                          </div>
                        )}
                      </div>
                    )}
                    {result.testResult === 'NÃO' && (
                      <div className="text-sm text-red-400">
                        {result.errorMessage || 'Erro desconhecido'}
                        {result.statusCode && (
                          <span className="ml-2 text-xs opacity-70">
                            (HTTP {result.statusCode})
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {!isRunning && results.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">
                  <span className="font-semibold text-emerald-400">{successCount}</span>
                  <span className="text-muted-foreground"> de {results.length} APIs funcionando</span>
                </span>
              </div>
              {failCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">{failCount} com falha</span>
                </div>
              )}
              {historyWarnings > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-amber-400">{historyWarnings} sem histórico completo</span>
                </div>
              )}
            </div>
            <Button onClick={handleRetest} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Testar Novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
