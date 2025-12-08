import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportData } from "@/lib/export-utils";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  RefreshCw, 
  ChevronDown, 
  FileText,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Settings,
  Loader2,
  Copy
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SecurityFinding {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info' | 'passed';
  title: string;
  description: string;
  location?: string;
  remediation?: string;
}

interface ScanResult {
  id: string;
  scan_timestamp: string;
  scanner_type: string;
  overall_status: 'critical' | 'warning' | 'healthy';
  findings_summary: {
    critical: number;
    warning: number;
    info: number;
    passed: number;
  };
  detailed_report: SecurityFinding[];
  execution_duration_ms: number;
  triggered_by: string;
  alert_sent: boolean;
}

interface AdminSettings {
  security_scan_enabled: boolean;
  security_alert_email: string | null;
  security_alert_threshold: string;
  security_scan_time: string | null;
  last_security_scan: string | null;
}

export const SecurityIntegrityTab = () => {
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>({
    security_scan_enabled: true,
    security_alert_email: null,
    security_alert_threshold: 'critical',
    security_scan_time: '03:00',
    last_security_scan: null
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('security_scan_results')
        .select('*')
        .order('scan_timestamp', { ascending: false })
        .limit(30);

      if (error) throw error;
      
      // Type assertion for the data
      const typedData = (data || []).map(item => ({
        ...item,
        findings_summary: (item.findings_summary || { critical: 0, warning: 0, info: 0, passed: 0 }) as ScanResult['findings_summary'],
        detailed_report: (Array.isArray(item.detailed_report) ? item.detailed_report : []) as unknown as SecurityFinding[],
        overall_status: (item.overall_status || 'healthy') as ScanResult['overall_status']
      }));
      
      setScanHistory(typedData);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('security_scan_enabled, security_alert_email, security_alert_threshold, last_security_scan')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          security_scan_enabled: data.security_scan_enabled ?? true,
          security_alert_email: data.security_alert_email,
          security_alert_threshold: data.security_alert_threshold ?? 'critical',
          security_scan_time: '03:00',
          last_security_scan: data.last_security_scan
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchScanHistory(), fetchSettings()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const runManualScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-integrity-scan', {
        body: { trigger: 'manual' }
      });

      if (error) throw error;

      toast.success('Scan concluído', {
        description: `Status: ${data.overall_status === 'healthy' ? '✅ Saudável' : data.overall_status === 'warning' ? '⚠️ Atenção' : '🔴 Crítico'}`
      });

      await fetchScanHistory();
      await fetchSettings();
    } catch (error) {
      console.error('Error running scan:', error);
      toast.error('Erro ao executar scan');
    } finally {
      setIsScanning(false);
    }
  };

  const updateSettings = async (updates: Partial<AdminSettings>) => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update(updates)
        .not('id', 'is', null);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...updates }));
      toast.success('Configurações atualizadas');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  const exportToPDF = async (scan: ScanResult) => {
    const pdfData = scan.detailed_report.map(finding => ({
      Categoria: finding.category,
      Severidade: finding.severity.toUpperCase(),
      Título: finding.title,
      Descrição: finding.description,
      Localização: finding.location || 'N/A',
      Remediação: finding.remediation || 'N/A'
    }));

    await exportData({
      filename: `security-scan-${format(new Date(scan.scan_timestamp), 'yyyy-MM-dd-HHmm')}`,
      data: pdfData,
      format: 'pdf',
      columns: [
        { key: 'Categoria', label: 'Categoria' },
        { key: 'Severidade', label: 'Severidade' },
        { key: 'Título', label: 'Título' },
        { key: 'Descrição', label: 'Descrição' },
        { key: 'Localização', label: 'Localização' },
        { key: 'Remediação', label: 'Remediação' }
      ]
    });

    toast.success('PDF exportado com sucesso');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <ShieldX className="w-5 h-5 text-destructive" />;
      case 'warning': return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
      case 'healthy': return <ShieldCheck className="w-5 h-5 text-green-500" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': 
        return <Badge variant="destructive" className="gap-1"><ShieldX className="w-3 h-3" />Crítico</Badge>;
      case 'warning': 
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 gap-1"><AlertTriangle className="w-3 h-3" />Atenção</Badge>;
      case 'info': 
        return <Badge variant="secondary" className="gap-1"><Info className="w-3 h-3" />Info</Badge>;
      case 'passed': 
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50 gap-1"><CheckCircle2 className="w-3 h-3" />Passou</Badge>;
      default: 
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const latestScan = scanHistory[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Segurança & Integridade</h2>
        </div>
        <Button 
          onClick={runManualScan} 
          disabled={isScanning}
          className="gap-2"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isScanning ? 'Escaneando...' : 'Executar Scan Manual'}
        </Button>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 ${latestScan?.overall_status === 'critical' ? 'border-destructive' : latestScan?.overall_status === 'warning' ? 'border-yellow-500' : 'border-green-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status Atual</p>
                <p className="text-2xl font-bold capitalize">
                  {latestScan?.overall_status === 'healthy' ? 'Saudável' : 
                   latestScan?.overall_status === 'warning' ? 'Atenção' : 
                   latestScan?.overall_status === 'critical' ? 'Crítico' : 'Desconhecido'}
                </p>
              </div>
              {latestScan && getStatusIcon(latestScan.overall_status)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-destructive">
                  {latestScan?.findings_summary?.critical ?? 0}
                </p>
              </div>
              <ShieldX className="w-5 h-5 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avisos</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {latestScan?.findings_summary?.warning ?? 0}
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold text-green-500">
                  {latestScan?.findings_summary?.passed ?? 0}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Scan Info */}
      {latestScan && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Último scan: {format(new Date(latestScan.scan_timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              <span>•</span>
              <span>Duração: {latestScan.execution_duration_ms}ms</span>
              <span>•</span>
              <span>Tipo: {latestScan.scanner_type === 'automated_daily' ? 'Automático' : 'Manual'}</span>
              {latestScan.alert_sent && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">Alerta enviado</Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Data/Hora</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Duração</TableHead>
                  <TableHead className="w-[80px]">📊</TableHead>
                  <TableHead className="w-[80px]">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanHistory.map((scan) => (
                  <Collapsible key={scan.id} open={expandedScanId === scan.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {format(new Date(scan.scan_timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        <span className="block text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(scan.scan_timestamp), { addSuffix: true, locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(scan.overall_status)}
                          <span className="capitalize">
                            {scan.overall_status === 'healthy' ? 'Saudável' : 
                             scan.overall_status === 'warning' ? 'Atenção' : 'Crítico'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{scan.execution_duration_ms}ms</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => exportToPDF(scan)}
                          title="Exportar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setExpandedScanId(expandedScanId === scan.id ? null : scan.id)}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedScanId === scan.id ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <div className="flex gap-4 text-sm">
                              <Badge variant="destructive">{scan.findings_summary.critical} Criticos</Badge>
                              <Badge className="bg-yellow-500/20 text-yellow-500">{scan.findings_summary.warning} Avisos</Badge>
                              <Badge variant="secondary">{scan.findings_summary.info} Info</Badge>
                              <Badge className="bg-green-500/20 text-green-500">{scan.findings_summary.passed} Aprovados</Badge>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-2">
                              {scan.detailed_report
                                .filter(f => f.severity !== 'passed')
                                .map((finding) => (
                                  <div key={finding.id} className="p-3 rounded-lg bg-background border">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          {getSeverityBadge(finding.severity)}
                                          <span className="text-xs text-muted-foreground">{finding.category}</span>
                                        </div>
                                        <p className="font-medium">{finding.title}</p>
                                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                                        {finding.location && (
                                          <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                                            {finding.location}
                                          </code>
                                        )}
                                        {finding.remediation && (
                                          <p className="text-xs text-primary mt-2">
                                            {finding.remediation}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              
                              {scan.detailed_report.filter(f => f.severity !== 'passed').length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nenhum problema encontrado neste scan
                                </p>
                              )}
                            </div>
                            
                            {/* Copy Prompt Button */}
                            {scan.detailed_report.filter(f => f.severity !== 'passed').length > 0 && (
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    const issues = scan.detailed_report
                                      .filter(f => f.severity !== 'passed')
                                      .map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}${f.location ? ` (Location: ${f.location})` : ''}${f.remediation ? ` | Fix: ${f.remediation}` : ''}`)
                                      .join('\n');
                                    
                                    const prompt = `Please fix the following security issues found in the scan:\n\n${issues}`;
                                    
                                    navigator.clipboard.writeText(prompt);
                                    toast.success('Prompt copiado para a area de transferencia');
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                  Copiar prompt
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                
                {scanHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum scan realizado ainda. Clique em "Executar Scan Manual" para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuracao de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Alertas Automaticos</Label>
              <p className="text-sm text-muted-foreground">Receber emails quando problemas forem detectados</p>
            </div>
            <Switch 
              checked={settings.security_scan_enabled}
              onCheckedChange={(checked) => {
                if (isEditMode) {
                  setSettings(prev => ({ ...prev, security_scan_enabled: checked }));
                }
              }}
              disabled={!isEditMode}
            />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Email para Alertas</Label>
              <Input 
                type="email"
                placeholder="admin@example.com"
                value={settings.security_alert_email || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, security_alert_email: e.target.value }))}
                disabled={!isEditMode}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nivel de Alerta</Label>
              <Select 
                value={settings.security_alert_threshold}
                onValueChange={(value) => setSettings(prev => ({ ...prev, security_alert_threshold: value }))}
                disabled={!isEditMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Apenas Criticos</SelectItem>
                  <SelectItem value="warning">Avisos e Criticos</SelectItem>
                  <SelectItem value="all">Todos os Scans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horario do Scan Automatico</Label>
              <Input 
                type="time"
                value={settings.security_scan_time || '03:00'}
                onChange={(e) => setSettings(prev => ({ ...prev, security_scan_time: e.target.value }))}
                disabled={!isEditMode}
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            {isEditMode ? (
              <Button 
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await updateSettings({
                      security_scan_enabled: settings.security_scan_enabled,
                      security_alert_email: settings.security_alert_email,
                      security_alert_threshold: settings.security_alert_threshold
                    });
                    setIsEditMode(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setIsEditMode(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityIntegrityTab;
