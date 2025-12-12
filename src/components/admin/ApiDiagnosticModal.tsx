import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Copy, Check, Database, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDate } from '@/lib/date-utils';

interface SyncMetadata {
  extracted_count?: number;
  period_start?: string;
  period_end?: string;
  fields_detected?: string[];
  last_record_value?: number;
  fetch_timestamp?: string;
}

interface ApiRegistry {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  fetch_start_date: string | null;
  fetch_end_date: string | null;
  target_table: string | null;
  last_http_status: number | null;
  last_sync_metadata: SyncMetadata | null;
  last_checked_at: string | null;
}

interface ApiTestResult {
  apiId: string;
  apiName: string;
  provider: string;
  baseUrl: string;
  targetTable: string | null;
  testResult: 'SIM' | 'NÃO' | 'PENDING';
  statusCode: number | null;
  latencyMs: number;
  // Configured dates
  configuredStart: string | null;
  configuredEnd: string | null;
  // Actual dates found
  firstDateFound: string | null;
  lastDateFound: string | null;
  // Data info
  extractedCount: number | null;
  fieldsDetected: string[] | null;
  lastRecordValue: number | null;
  lastSyncAt: string | null;
  // Error info
  errorMessage: string | null;
  diagnosis: 'OK' | 'API_NO_HISTORY' | 'PARTIAL_HISTORY' | 'API_ERROR' | 'PENDING';
  diagnosisMessage: string | null;
  coveragePercent: number | null;
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
  const [showErrorReport, setShowErrorReport] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHasRun(false);
      setResults([]);
      setApis([]);
      setShowErrorReport(false);
    }
  }, [open]);

  // Fetch APIs when modal opens
  useEffect(() => {
    if (open && !hasRun && apis.length === 0) {
      fetchApis();
    }
  }, [open, hasRun, apis.length]);

  const fetchApis = async () => {
    const { data, error } = await supabase
      .from('system_api_registry')
      .select('id, name, provider, base_url, fetch_start_date, fetch_end_date, target_table, last_http_status, last_sync_metadata, last_checked_at')
      .in('provider', ['BCB', 'IBGE', 'IPEADATA', 'WorldBank'])
      .order('provider', { ascending: true });

    if (error) {
      console.error('[API_DIAGNOSTIC] Error fetching APIs:', error);
      return;
    }

    const apiList = (data || []) as ApiRegistry[];
    setApis(apiList);
    
    // Initialize results with PENDING status
    const initialResults: ApiTestResult[] = apiList.map(api => {
      const syncMeta = api.last_sync_metadata as SyncMetadata | null;
      return {
        apiId: api.id,
        apiName: api.name,
        provider: api.provider,
        baseUrl: api.base_url,
        targetTable: api.target_table,
        testResult: 'PENDING',
        statusCode: null,
        latencyMs: 0,
        configuredStart: api.fetch_start_date?.substring(0, 10) || null,
        configuredEnd: api.fetch_end_date?.substring(0, 10) || null,
        firstDateFound: null,
        lastDateFound: null,
        extractedCount: null,
        fieldsDetected: syncMeta?.fields_detected || null,
        lastRecordValue: syncMeta?.last_record_value || null,
        lastSyncAt: api.last_checked_at || null,
        errorMessage: null,
        diagnosis: 'PENDING',
        diagnosisMessage: null,
        coveragePercent: null
      };
    });
    
    setResults(initialResults);
    
    // Auto-start tests
    runTests(apiList, initialResults);
  };

  const calculateCoverage = (configStart: string | null, configEnd: string | null, actualStart: string | null, actualEnd: string | null): number | null => {
    if (!configStart || !configEnd || !actualStart) return null;
    
    const configStartDate = new Date(configStart);
    const configEndDate = new Date(configEnd);
    const actualStartDate = new Date(actualStart);
    const actualEndDate = actualEnd ? new Date(actualEnd) : new Date();
    
    const configDays = Math.abs(configEndDate.getTime() - configStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const actualDays = Math.abs(actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (configDays === 0) return 100;
    
    // Calculate how much of the configured range is covered
    const overlapStart = Math.max(configStartDate.getTime(), actualStartDate.getTime());
    const overlapEnd = Math.min(configEndDate.getTime(), actualEndDate.getTime());
    const overlapDays = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
    
    return Math.min(100, Math.round((overlapDays / configDays) * 100));
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
          const lastDate = data.syncMetadata?.period_end || null;
          const extractedCount = data.syncMetadata?.extracted_count || 0;
          const fieldsDetected = data.syncMetadata?.fields_detected || [];
          const lastValue = data.syncMetadata?.last_record_value || null;
          const configStart = api.fetch_start_date?.substring(0, 10) || null;
          const configEnd = api.fetch_end_date?.substring(0, 10) || null;
          
          // Calculate coverage
          const coverage = calculateCoverage(configStart, configEnd, firstDate, lastDate);
          
          // Diagnose historical integrity
          let diagnosis: 'OK' | 'API_NO_HISTORY' | 'PARTIAL_HISTORY' = 'OK';
          let diagnosisMessage: string | null = null;
          
          if (configStart && firstDate) {
            const configDate = new Date(configStart);
            const actualDate = new Date(firstDate);
            const daysDiff = Math.floor((actualDate.getTime() - configDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 365) {
              const yearsDiff = Math.floor(daysDiff / 365);
              diagnosis = 'API_NO_HISTORY';
              diagnosisMessage = `API não possui dados antes de ${firstDate} (${yearsDiff} ano(s) após configurado)`;
            } else if (daysDiff > 30) {
              const monthsDiff = Math.floor(daysDiff / 30);
              diagnosis = 'PARTIAL_HISTORY';
              diagnosisMessage = `Histórico inicia ${monthsDiff} mês(es) após o configurado`;
            }
          }
          
          updatedResults[i] = {
            ...updatedResults[i],
            testResult: 'SIM',
            statusCode: data.statusCode || 200,
            latencyMs: data.latency || latency,
            firstDateFound: firstDate,
            lastDateFound: lastDate,
            extractedCount,
            fieldsDetected,
            lastRecordValue: lastValue,
            errorMessage: null,
            diagnosis,
            diagnosisMessage,
            coveragePercent: coverage
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
    setShowErrorReport(false);
    onOpenChange(false);
  };

  // Using centralized formatDate from @/lib/date-utils (imported via date-fns format)

  const generateProblemAnalysis = (result: ApiTestResult): string => {
    const analyses: string[] = [];
    
    // N/A - API returned valid response but no data
    if (result.extractedCount === 0 && result.testResult === 'SIM') {
      analyses.push(
        `A API retornou resposta HTTP válida (${result.statusCode || 200}) mas sem registros de dados.\n` +
        `  Causas prováveis:\n` +
        `  • Série histórica descontinuada ou ainda não publicada para o período solicitado\n` +
        `  • Parâmetros de consulta (datas, códigos) podem estar incorretos\n` +
        `  • Formato de requisição incompatível com a estrutura esperada pela API\n` +
        `  Recomendação: Verificar documentação da API e validar parâmetros de período`
      );
    }
    
    // Connection/HTTP error
    if (result.testResult === 'NÃO') {
      analyses.push(
        `Falha na comunicação com a API (HTTP ${result.statusCode || 'timeout'}).\n` +
        `  Causas prováveis:\n` +
        `  • Servidor da API temporariamente indisponível ou em manutenção\n` +
        `  • Rate limiting (excesso de requisições em curto período)\n` +
        `  • Timeout de rede ou bloqueio por firewall\n` +
        `  • URL do endpoint alterada ou descontinuada\n` +
        `  Recomendação: Tentar novamente em alguns minutos; verificar se URL está atualizada`
      );
    }
    
    // No history data
    if (result.diagnosis === 'API_NO_HISTORY') {
      analyses.push(
        `API funcional mas sem dados históricos disponíveis.\n` +
        `  Causas prováveis:\n` +
        `  • A série pode ter sido descontinuada ou migrada para outro endpoint\n` +
        `  • Dados históricos foram removidos ou arquivados\n` +
        `  • Período solicitado anterior ao início da coleta de dados\n` +
        `  Recomendação: Verificar período de disponibilidade na documentação oficial`
      );
    }
    
    // Partial history
    if (result.diagnosis === 'PARTIAL_HISTORY') {
      const coverageInfo = result.coveragePercent !== null ? ` (${result.coveragePercent}% de cobertura)` : '';
      analyses.push(
        `Cobertura incompleta do período configurado${coverageInfo}.\n` +
        `  Causas prováveis:\n` +
        `  • Série iniciou após a data inicial configurada\n` +
        `  • Lacunas na publicação de dados em determinados períodos\n` +
        `  • Dados mais recentes ainda não foram publicados\n` +
        `  Recomendação: Ajustar período de coleta para coincidir com disponibilidade real`
      );
    }
    
    // Period unavailable
    if (result.firstDateFound === null && result.extractedCount && result.extractedCount > 0) {
      analyses.push(
        `Dados extraídos mas período não identificado.\n` +
        `  Causas prováveis:\n` +
        `  • Formato de data na resposta JSON difere do padrão esperado\n` +
        `  • Campo de data possui nome não reconhecido pelo parser\n` +
        `  Recomendação: Verificar estrutura JSON e ajustar parsing se necessário`
      );
    }
    
    return analyses.length > 0 ? analyses.join('\n\n') : 'Sem problemas identificados.';
  };

  const generateErrorReport = (): string => {
    const now = new Date().toLocaleString('pt-BR');
    
    // Expanded filter to include all problem types
    const problems = results.filter(r => 
      r.testResult === 'NÃO' || 
      r.diagnosis === 'API_NO_HISTORY' || 
      r.diagnosis === 'PARTIAL_HISTORY' ||
      r.extractedCount === 0 ||
      r.coveragePercent === null ||
      r.firstDateFound === null
    );
    
    // Statistics
    const functional = results.filter(r => r.testResult === 'SIM' && r.extractedCount && r.extractedCount > 0).length;
    const connectionErrors = results.filter(r => r.testResult === 'NÃO').length;
    const naApis = results.filter(r => r.testResult === 'SIM' && r.extractedCount === 0).length;
    const partialCoverage = results.filter(r => r.diagnosis === 'PARTIAL_HISTORY' || r.diagnosis === 'API_NO_HISTORY').length;
    
    let report = `${'═'.repeat(70)}\n`;
    report += `            RELATÓRIO DE DIAGNÓSTICO DE APIs\n`;
    report += `${'═'.repeat(70)}\n`;
    report += `Data de Geração: ${now}\n\n`;
    
    // Legend section
    report += `LEGENDA DE PROBLEMAS:\n`;
    report += `${'─'.repeat(70)}\n`;
    report += `• N/A (Não Disponível): API retornou resposta válida mas sem dados para\n`;
    report += `  o período solicitado. Possíveis causas: série descontinuada, dados ainda\n`;
    report += `  não publicados, ou formato de requisição inválido.\n\n`;
    report += `• Cobertura Incompleta: API não possui dados para todo o período configurado.\n`;
    report += `  Possíveis causas: série iniciou após data configurada, ou dados\n`;
    report += `  históricos foram removidos.\n\n`;
    report += `• Período Indisponível: API não retornou informações de período válidas.\n`;
    report += `  Possíveis causas: formato de resposta inesperado, ou erro de parsing.\n\n`;
    report += `• Erro de Conexão: Falha ao comunicar com a API.\n`;
    report += `  Possíveis causas: timeout, servidor indisponível, ou rate limiting.\n\n`;
    report += `${'═'.repeat(70)}\n\n`;
    
    // Statistics summary
    report += `RESUMO ESTATÍSTICO:\n`;
    report += `${'─'.repeat(70)}\n`;
    report += `  Total de APIs Testadas:     ${results.length}\n`;
    report += `  ✓ APIs Funcionais:          ${functional}\n`;
    report += `  ✗ APIs com Erro Conexão:    ${connectionErrors}\n`;
    report += `  ○ APIs com Dados N/A:       ${naApis}\n`;
    report += `  ◐ APIs com Cobertura Parcial: ${partialCoverage}\n`;
    report += `\n${'═'.repeat(70)}\n\n`;
    
    if (problems.length === 0) {
      report += `✓ Nenhum problema encontrado. Todas as APIs estão funcionando corretamente.\n`;
      return report;
    }
    
    report += `DETALHAMENTO DOS PROBLEMAS (${problems.length} APIs):\n`;
    report += `${'═'.repeat(70)}\n\n`;
    
    problems.forEach((result, index) => {
      const problemType = result.testResult === 'NÃO' ? '✗ ERRO' : 
                          result.extractedCount === 0 ? '○ N/A' :
                          result.diagnosis === 'API_NO_HISTORY' ? '◐ SEM HISTÓRICO' :
                          result.diagnosis === 'PARTIAL_HISTORY' ? '◐ PARCIAL' : '⚠ AVISO';
      
      report += `[${problemType}] ${index + 1}. ${result.apiName}\n`;
      report += `${'─'.repeat(50)}\n`;
      report += `Provedor: ${result.provider}\n`;
      report += `Tabela Destino: ${result.targetTable || 'Não definida'}\n`;
      report += `URL: ${result.baseUrl}\n\n`;
      
      report += `PERÍODO:\n`;
      report += `  Encontrado: ${result.firstDateFound || 'N/A'} → ${result.lastDateFound || 'N/A'}\n`;
      report += `  Cobertura: ${result.coveragePercent !== null ? `${result.coveragePercent}%` : 'N/A'}\n\n`;
      
      report += `DADOS:\n`;
      report += `  Registros: ${result.extractedCount?.toLocaleString() || 0}\n`;
      report += `  Campos: ${result.fieldsDetected?.join(', ') || 'Nenhum detectado'}\n`;
      report += `  Último Valor: ${result.lastRecordValue !== null ? result.lastRecordValue.toLocaleString('pt-BR') : 'N/A'}\n\n`;
      
      report += `STATUS: ${result.testResult} | HTTP: ${result.statusCode || 'N/A'} | Latência: ${result.latencyMs}ms\n\n`;
      
      report += `ANÁLISE DO PROBLEMA:\n`;
      report += generateProblemAnalysis(result);
      report += `\n`;
      
      if (result.errorMessage) {
        report += `\nMensagem de Erro Original: ${result.errorMessage}\n`;
      }
      
      report += `\n${'═'.repeat(70)}\n\n`;
    });
    
    return report;
  };

  const handleCopyReport = async () => {
    const report = generateErrorReport();
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCoverageColor = (coverage: number | null, diagnosis: string): string => {
    if (coverage === null) return 'text-muted-foreground';
    if (diagnosis === 'API_NO_HISTORY') return 'text-red-400';
    if (diagnosis === 'PARTIAL_HISTORY') return 'text-amber-400';
    if (coverage >= 90) return 'text-emerald-400';
    if (coverage >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const successCount = results.filter(r => r.testResult === 'SIM').length;
  const failCount = results.filter(r => r.testResult === 'NÃO').length;
  const historyWarnings = results.filter(r => r.diagnosis === 'API_NO_HISTORY' || r.diagnosis === 'PARTIAL_HISTORY').length;
  const hasErrors = failCount > 0 || historyWarnings > 0;

  // Error Report Modal
  if (showErrorReport) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Relatório de Erros
            </DialogTitle>
            <DialogDescription>
              Relatório em texto puro para análise e tratamento dos erros
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <pre className="bg-muted/50 border rounded-lg p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-[55vh] overflow-y-auto">
                {generateErrorReport()}
              </pre>
            </div>

            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowErrorReport(false)}
              >
                Voltar ao Diagnóstico
              </Button>
              <Button 
                onClick={handleCopyReport}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Relatório
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Diagnóstico de APIs Externas
            <Badge variant="secondary" className="text-xs ml-1">
              {apis.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Testando conectividade e integridade histórica de todas as APIs configuradas (BCB, IBGE, IPEADATA e WorldBank)
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
                <TableHead className="w-[26%]">API</TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Período
                  </div>
                </TableHead>
                <TableHead className="w-[12%] text-center">Status</TableHead>
                <TableHead className="w-[20%]">
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Registros
                  </div>
                </TableHead>
                <TableHead className="w-[22%]">Cobertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.apiId} className="group">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 ${
                            result.provider === 'BCB' 
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                              : result.provider === 'WorldBank'
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                          }`}
                        >
                          {result.provider}
                        </Badge>
                        <span className="font-medium text-sm">{result.apiName}</span>
                      </div>
                      {result.targetTable && (
                        <div className="text-[10px] text-muted-foreground">
                          → {result.targetTable}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {result.testResult === 'PENDING' ? (
                      <span className="text-xs text-muted-foreground italic">Aguardando...</span>
                    ) : result.testResult === 'SIM' && result.firstDateFound ? (
                      <div className="space-y-0.5">
                        <div className={`text-xs font-mono ${getCoverageColor(result.coveragePercent, result.diagnosis)}`}>
                          {formatDate(result.firstDateFound)}
                        </div>
                        <div className={`text-xs font-mono ${getCoverageColor(result.coveragePercent, result.diagnosis)}`}>
                          → {formatDate(result.lastDateFound)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-red-400 italic">Indisponível</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {result.testResult === 'PENDING' && (
                      <Clock className="h-4 w-4 text-muted-foreground animate-pulse mx-auto" />
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
                    {result.testResult === 'PENDING' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : result.testResult === 'SIM' ? (
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-foreground">
                          {result.extractedCount?.toLocaleString() || 0}
                        </div>
                        {result.lastRecordValue !== null && (
                          <div className="text-[10px] text-muted-foreground">
                            Último: {result.lastRecordValue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-red-400">Erro</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {result.testResult === 'PENDING' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : result.testResult === 'SIM' ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                result.diagnosis === 'OK' ? 'bg-emerald-500' :
                                result.diagnosis === 'PARTIAL_HISTORY' ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${result.coveragePercent || 0}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${getCoverageColor(result.coveragePercent, result.diagnosis)}`}>
                            {result.coveragePercent !== null ? `${result.coveragePercent}%` : 'N/A'}
                          </span>
                        </div>
                        {result.diagnosis !== 'OK' && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                            <span className="text-[10px] text-amber-400 truncate" title={result.diagnosisMessage || ''}>
                              {result.diagnosis === 'API_NO_HISTORY' ? 'Sem histórico' : 'Parcial'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-red-400 truncate" title={result.errorMessage || ''}>
                        {result.errorMessage?.substring(0, 30) || 'Erro'}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary - Expanded Statistics */}
        {!isRunning && results.length > 0 && (() => {
          const functionalApis = results.filter(r => r.testResult === 'SIM' && r.extractedCount && r.extractedCount > 0).length;
          const connectionErrors = results.filter(r => r.testResult === 'NÃO').length;
          const naApis = results.filter(r => r.testResult === 'SIM' && r.extractedCount === 0).length;
          const partialCoverage = results.filter(r => r.diagnosis === 'PARTIAL_HISTORY' || r.diagnosis === 'API_NO_HISTORY').length;
          const hasProblems = connectionErrors > 0 || naApis > 0 || partialCoverage > 0;
          
          return (
            <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="text-lg font-bold text-emerald-400">{functionalApis}</div>
                    <div className="text-[10px] text-muted-foreground">APIs Funcionais</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded border ${connectionErrors > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/30 border-muted'}`}>
                  <XCircle className={`h-4 w-4 ${connectionErrors > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
                  <div>
                    <div className={`text-lg font-bold ${connectionErrors > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{connectionErrors}</div>
                    <div className="text-[10px] text-muted-foreground">Erros Conexão</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded border ${naApis > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-muted/30 border-muted'}`}>
                  <AlertTriangle className={`h-4 w-4 ${naApis > 0 ? 'text-amber-400' : 'text-muted-foreground'}`} />
                  <div>
                    <div className={`text-lg font-bold ${naApis > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{naApis}</div>
                    <div className="text-[10px] text-muted-foreground">Dados N/A</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded border ${partialCoverage > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-muted/30 border-muted'}`}>
                  <AlertTriangle className={`h-4 w-4 ${partialCoverage > 0 ? 'text-orange-400' : 'text-muted-foreground'}`} />
                  <div>
                    <div className={`text-lg font-bold ${partialCoverage > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>{partialCoverage}</div>
                    <div className="text-[10px] text-muted-foreground">Cobertura Parcial</div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Total: {results.length} APIs testadas
                </div>
                <div className="flex items-center gap-2">
                  {hasProblems && (
                    <>
                      <Button 
                        onClick={handleCopyReport}
                        variant="outline" 
                        size="sm"
                        className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar Relatório
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => setShowErrorReport(true)} 
                        variant="outline" 
                        size="sm"
                        className="gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                      >
                        <FileText className="h-3 w-3" />
                        Ver Relatório
                      </Button>
                    </>
                  )}
                  <Button onClick={handleRetest} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-3 w-3" />
                    Testar Novamente
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
