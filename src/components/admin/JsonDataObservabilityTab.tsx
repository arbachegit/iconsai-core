import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileJson, Table as TableIcon, Database, RefreshCw, Eye, Plus, AlertCircle, PlayCircle, Braces } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApiWithJson {
  id: string;
  name: string;
  provider: string;
  last_raw_response: unknown;
  last_response_at: string | null;
  economic_indicators: Array<{ id: string; name: string; code: string }>;
}

interface ParsedDataPoint {
  date: string;
  value: number;
  indicator: string;
}

interface MetadataField {
  key: string;
  sampleValue: string;
  fieldType: string;
}

export const JsonDataObservabilityTab = () => {
  const [apis, setApis] = useState<ApiWithJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApi, setSelectedApi] = useState<ApiWithJson | null>(null);
  const [showOrganizedModal, setShowOrganizedModal] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedDataPoint[]>([]);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [insertingAll, setInsertingAll] = useState(false);
  const [insertAllProgress, setInsertAllProgress] = useState({ current: 0, total: 0, inserted: 0 });
  const [insertResult, setInsertResult] = useState<{ jsonRecords: number; existingRecords: number; insertedRecords: number } | null>(null);

  useEffect(() => {
    fetchApis();
  }, []);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_api_registry')
        .select(`
          id, name, provider, last_raw_response, last_response_at,
          economic_indicators (id, name, code)
        `)
        .not('last_raw_response', 'is', null)
        .order('last_response_at', { ascending: false });

      if (error) throw error;
      setApis((data || []) as unknown as ApiWithJson[]);
    } catch (error) {
      console.error('Error fetching APIs:', error);
      toast.error('Erro ao carregar dados JSON');
    } finally {
      setLoading(false);
    }
  };

  const parseJsonData = (api: ApiWithJson): ParsedDataPoint[] => {
    const rawJson = api.last_raw_response;
    if (!rawJson) return [];

    const indicatorName = api.economic_indicators?.[0]?.name || api.name;
    const parsed: ParsedDataPoint[] = [];

    if (api.provider === 'BCB') {
      const bcbData = rawJson as Array<{ data: string; valor: string }>;
      for (const item of bcbData) {
        if (item.data && item.valor) {
          const [day, month, year] = item.data.split('/');
          parsed.push({
            date: `${year}-${month}-${day}`,
            value: parseFloat(item.valor.replace(',', '.')),
            indicator: indicatorName
          });
        }
      }
    } else if (api.provider === 'IBGE') {
      const ibgeData = rawJson as Array<{ resultados?: Array<{ series?: Array<{ serie?: Record<string, string> }> }> }>;
      if (ibgeData[0]?.resultados) {
        for (const resultado of ibgeData[0].resultados) {
          for (const serie of resultado.series || []) {
            const serieData = serie.serie || {};
            for (const [period, value] of Object.entries(serieData)) {
              if (!value || value === '-' || value === '...') continue;
              let refDate: string;
              if (period.length === 6) {
                refDate = `${period.substring(0, 4)}-${period.substring(4, 6)}-01`;
              } else {
                refDate = `${period}-01-01`;
              }
              parsed.push({
                date: refDate,
                value: parseFloat(value.replace(',', '.')),
                indicator: indicatorName
              });
            }
          }
        }
      }
    }

    return parsed.sort((a, b) => b.date.localeCompare(a.date));
  };

  const extractAllMetadataFields = (json: unknown): MetadataField[] => {
    const fields: MetadataField[] = [];
    const seen = new Set<string>();

    const extractFields = (obj: unknown, prefix: string = '') => {
      if (obj === null || obj === undefined) return;

      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          extractFields(obj[0], prefix + '[0]');
        }
      } else if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (!seen.has(fullKey)) {
            seen.add(fullKey);
            
            let sampleValue = '';
            let fieldType = typeof value;
            
            if (value === null) {
              fieldType = 'null';
              sampleValue = 'null';
            } else if (Array.isArray(value)) {
              fieldType = 'array';
              sampleValue = `[${value.length} items]`;
            } else if (typeof value === 'object') {
              fieldType = 'object';
              sampleValue = '{...}';
            } else {
              sampleValue = String(value).substring(0, 100);
            }
            
            fields.push({ key: fullKey, sampleValue, fieldType });
          }
          
          if (typeof value === 'object' && value !== null) {
            extractFields(value, fullKey);
          }
        }
      }
    };

    extractFields(json);
    return fields.sort((a, b) => a.key.localeCompare(b.key));
  };

  const handleViewOrganized = (api: ApiWithJson) => {
    setSelectedApi(api);
    const data = parseJsonData(api);
    setParsedData(data);
    setShowOrganizedModal(true);
  };

  const handleViewRaw = (api: ApiWithJson) => {
    setSelectedApi(api);
    setShowRawModal(true);
  };

  const handleViewMetadata = (api: ApiWithJson) => {
    setSelectedApi(api);
    const fields = extractAllMetadataFields(api.last_raw_response);
    setMetadataFields(fields);
    setShowMetadataModal(true);
  };

  const handleForceInsert = async (api: ApiWithJson) => {
    const indicatorId = api.economic_indicators?.[0]?.id;
    if (!indicatorId) {
      toast.error('Indicador não encontrado para esta API');
      return;
    }

    setInsertingId(api.id);
    setInsertResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('compare-and-insert-missing', {
        body: { indicatorId }
      });

      if (error) throw error;

      setInsertResult(data);

      if (data.insertedRecords > 0) {
        toast.success(`${data.insertedRecords} registros inseridos com sucesso!`);
      } else {
        toast.info('Todos os registros já existem no banco de dados');
      }
    } catch (error) {
      console.error('Error forcing insert:', error);
      toast.error('Erro ao executar INSERT mandatório');
    } finally {
      setInsertingId(null);
    }
  };

  const handleInsertAll = async () => {
    const apisWithIndicators = apis.filter(api => api.economic_indicators?.length > 0);
    
    if (apisWithIndicators.length === 0) {
      toast.warning('Nenhuma API com indicador configurado');
      return;
    }

    setInsertingAll(true);
    setInsertAllProgress({ current: 0, total: apisWithIndicators.length, inserted: 0 });
    setInsertResult(null);

    let totalInserted = 0;
    let totalJsonRecords = 0;
    let totalExisting = 0;

    for (let i = 0; i < apisWithIndicators.length; i++) {
      const api = apisWithIndicators[i];
      const indicatorId = api.economic_indicators[0].id;
      
      setInsertAllProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const { data, error } = await supabase.functions.invoke('compare-and-insert-missing', {
          body: { indicatorId }
        });

        if (!error && data) {
          totalInserted += data.insertedRecords || 0;
          totalJsonRecords += data.jsonRecords || 0;
          totalExisting += data.existingRecords || 0;
        }
      } catch (err) {
        console.error(`Error inserting for ${api.name}:`, err);
      }

      setInsertAllProgress(prev => ({ ...prev, inserted: totalInserted }));

      // Small delay between inserts
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setInsertingAll(false);
    setInsertResult({
      jsonRecords: totalJsonRecords,
      existingRecords: totalExisting,
      insertedRecords: totalInserted
    });

    if (totalInserted > 0) {
      toast.success(`INSERT ALL concluído: ${totalInserted} registros inseridos`);
    } else {
      toast.info('INSERT ALL concluído: todos os registros já existem');
    }
  };

  const getRecordCount = (api: ApiWithJson): number => {
    return parseJsonData(api).length;
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'BCB': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'IBGE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'WorldBank': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'IMF': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'YahooFinance': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileJson className="w-6 h-6 text-primary" />
            JSON Dados - Observabilidade
          </h2>
          <p className="text-muted-foreground mt-1">
            Visualize e compare dados brutos das APIs externas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInsertAll}
            disabled={insertingAll || apis.length === 0}
            className="gap-2"
          >
            {insertingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {insertAllProgress.current}/{insertAllProgress.total}
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                INSERT ALL
              </>
            )}
          </Button>
          <Button onClick={fetchApis} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {apis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum dado JSON disponível</p>
            <p className="text-sm text-muted-foreground mt-1">
              Execute uma coleta de dados para visualizar os JSONs
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fontes de Dados Externas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte/API</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-center">Registros</TableHead>
                  <TableHead className="text-center">Metadados Brutos</TableHead>
                  <TableHead className="text-center">JSON Organizado</TableHead>
                  <TableHead className="text-center">JSON Bruto</TableHead>
                  <TableHead className="text-center">Forçar INSERT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apis.map((api) => (
                  <TableRow key={api.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getProviderColor(api.provider)}>
                          {api.provider}
                        </Badge>
                        <span className="font-medium">
                          {api.economic_indicators?.[0]?.name || api.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {api.last_response_at ? (
                        <span className="text-sm">
                          {format(new Date(api.last_response_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{getRecordCount(api)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMetadata(api)}
                        className="gap-1"
                      >
                        <Braces className="w-4 h-4" />
                        Dados
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrganized(api)}
                        className="gap-1"
                      >
                        <TableIcon className="w-4 h-4" />
                        Ver Tabela
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRaw(api)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver JSON
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleForceInsert(api)}
                        disabled={insertingId === api.id}
                        className="gap-1"
                      >
                        {insertingId === api.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        INSERT
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal: Metadados Brutos */}
      <Dialog open={showMetadataModal} onOpenChange={setShowMetadataModal}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Braces className="w-5 h-5 text-primary" />
              Metadados Brutos - {selectedApi?.economic_indicators?.[0]?.name || selectedApi?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todos os campos (key:value) disponíveis no JSON bruto da API
          </p>
          <ScrollArea className="h-[400px] mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo (Key)</TableHead>
                  <TableHead>Valor de Exemplo</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadataFields.map((field, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{field.key}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{field.sampleValue}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {field.fieldType}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Total: {metadataFields.length} campos detectados
            </span>
            <Button variant="outline" onClick={() => setShowMetadataModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: JSON Organizado */}
      <Dialog open={showOrganizedModal} onOpenChange={setShowOrganizedModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-primary" />
              JSON Organizado - {selectedApi?.economic_indicators?.[0]?.name || selectedApi?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Indicador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(item.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.indicator}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Total: {parsedData.length} registros
            </span>
            <Button variant="outline" onClick={() => setShowOrganizedModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: JSON Bruto */}
      <Dialog open={showRawModal} onOpenChange={setShowRawModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              JSON Bruto - {selectedApi?.economic_indicators?.[0]?.name || selectedApi?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {selectedApi?.last_raw_response 
                ? JSON.stringify(selectedApi.last_raw_response, null, 2)
                : 'Nenhum dado disponível'}
            </pre>
          </ScrollArea>
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Última atualização: {selectedApi?.last_response_at 
                ? format(new Date(selectedApi.last_response_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : '-'}
            </span>
            <Button variant="outline" onClick={() => setShowRawModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Card */}
      {insertResult && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Resultado do INSERT {insertingAll ? 'ALL' : 'Mandatório'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{insertResult.jsonRecords}</div>
                <div className="text-sm text-muted-foreground">Registros no JSON</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-amber-500">{insertResult.existingRecords}</div>
                <div className="text-sm text-muted-foreground">Já no Banco</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-emerald-500">{insertResult.insertedRecords}</div>
                <div className="text-sm text-muted-foreground">Inseridos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};