import { useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';
import { Download, FileImage, FileText, MessageCircle, Mail, ChevronDown, Copy, Eye, BarChart3, TrendingUp, PieChart as PieChartIcon, AreaChart as AreaChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartData {
  type: ChartType;
  title?: string;
  data: Array<{
    name: string;
    value?: number;
    [key: string]: any;
  }>;
  xKey?: string;
  dataKeys?: string[];
  colors?: string[];
}

interface ChatChartRendererProps {
  chartData: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // green
  'hsl(217, 91%, 60%)', // blue
  'hsl(38, 92%, 50%)',  // amber
  'hsl(0, 84%, 60%)',   // red
  'hsl(187, 85%, 43%)', // cyan
  'hsl(330, 81%, 60%)', // pink
  'hsl(262, 83%, 58%)', // violet
];

const CHART_TYPE_ICONS: Record<ChartType, { icon: React.ElementType; label: string }> = {
  bar: { icon: BarChart3, label: 'Barras' },
  line: { icon: TrendingUp, label: 'Linha' },
  pie: { icon: PieChartIcon, label: 'Pizza' },
  area: { icon: AreaChartIcon, label: 'Área' },
};

// Get chart as image data
const getChartAsImage = async (chartRef: React.RefObject<HTMLDivElement>): Promise<{ dataUrl: string; blob: Blob; width: number; height: number } | null> => {
  if (!chartRef.current) return null;
  
  try {
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#1a1a2e',
      scale: 2,
    });
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            blob,
            width: canvas.width / 2,
            height: canvas.height / 2
          });
        } else {
          resolve(null);
        }
      }, 'image/png');
    });
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
};

export const ChatChartRenderer = ({ chartData }: ChatChartRendererProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<'whatsapp' | 'email' | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  
  // Local type override for instant conversion
  const [localType, setLocalType] = useState<ChartType | null>(null);

  const parsedData = useMemo(() => {
    try {
      return JSON.parse(chartData) as ChartData;
    } catch {
      console.error('Failed to parse chart data:', chartData);
      return null;
    }
  }, [chartData]);
  
  // Effective type = local override or original type
  const effectiveType = localType || parsedData?.type || 'bar';

  const filename = `grafico-${parsedData?.title?.replace(/\s+/g, '-') || 'chart'}`;

  // Download as PNG
  const handleDownloadPng = async () => {
    const result = await getChartAsImage(chartRef);
    if (!result) {
      toast.error('Erro ao capturar gráfico');
      return;
    }
    
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = result.dataUrl;
    link.click();
    toast.success('Gráfico baixado como PNG!');
  };

  // Download as PDF
  const handleDownloadPdf = async () => {
    const result = await getChartAsImage(chartRef);
    if (!result) {
      toast.error('Erro ao capturar gráfico');
      return;
    }
    
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Title
      pdf.setFontSize(16);
      const title = parsedData?.title || 'Gráfico';
      pdf.text(title, pageWidth / 2, 15, { align: 'center' });
      
      // Calculate image dimensions to fit the page
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - 40;
      const ratio = Math.min(maxWidth / result.width, maxHeight / result.height);
      const imgWidth = result.width * ratio;
      const imgHeight = result.height * ratio;
      const x = (pageWidth - imgWidth) / 2;
      
      pdf.addImage(result.dataUrl, 'PNG', x, 25, imgWidth, imgHeight);
      pdf.save(`${filename}.pdf`);
      toast.success('Gráfico baixado como PDF!');
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast.error('Erro ao criar PDF');
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    const result = await getChartAsImage(chartRef);
    if (!result) {
      toast.error('Erro ao capturar gráfico');
      return;
    }
    
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': result.blob })
      ]);
      toast.success('Gráfico copiado para a área de transferência!');
    } catch (err) {
      console.error('Clipboard write failed:', err);
      toast.error('Navegador não suporta copiar imagens');
    }
  };

  // Preview before sharing
  const handlePreviewShare = async (action: 'whatsapp' | 'email') => {
    const result = await getChartAsImage(chartRef);
    if (!result) {
      toast.error('Erro ao gerar preview');
      return;
    }
    setPreviewData({ dataUrl: result.dataUrl, width: result.width, height: result.height });
    setPendingBlob(result.blob);
    setPendingAction(action);
    setPreviewOpen(true);
  };

  // Confirm share after preview
  const handleConfirmShare = async () => {
    setPreviewOpen(false);
    
    if (!pendingBlob || !previewData) return;
    
    const file = new File([pendingBlob], `${filename}.png`, { type: 'image/png' });
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: parsedData?.title || 'Gráfico KnowYOU',
          files: [file],
        });
        setPendingAction(null);
        setPreviewData(null);
        setPendingBlob(null);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
    
    // Fallback
    if (pendingAction === 'whatsapp') {
      const text = encodeURIComponent(`📊 ${parsedData?.title || 'Gráfico'} - Gerado por KnowYOU`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      toast.info('Abra o WhatsApp para compartilhar');
    } else if (pendingAction === 'email') {
      const subject = encodeURIComponent(`Gráfico: ${parsedData?.title || 'KnowYOU'}`);
      const body = encodeURIComponent('Segue o gráfico gerado pelo KnowYOU.');
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
    
    setPendingAction(null);
    setPreviewData(null);
    setPendingBlob(null);
  };

  if (!parsedData || !parsedData.data || parsedData.data.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        Erro ao renderizar gráfico
      </div>
    );
  }

  const { title, data, xKey = 'name', dataKeys = ['value'], colors = COLORS } = parsedData;

  const renderChart = () => {
    switch (effectiveType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              {dataKeys.length > 1 && <Legend />}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              {dataKeys.length > 1 && <Legend />}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ fill: colors[index % colors.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              {dataKeys.length > 1 && <Legend />}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="my-4 p-4 bg-card/50 border border-border rounded-lg relative group">
        {title && (
          <h4 className="text-sm font-semibold text-foreground mb-3 text-center">{title}</h4>
        )}
        <div ref={chartRef}>
          {renderChart()}
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-wrap justify-end">
          {/* Type conversion buttons */}
          <div className="flex gap-0.5 border border-border rounded-md bg-background/80 backdrop-blur-sm p-0.5">
            {(Object.entries(CHART_TYPE_ICONS) as [ChartType, typeof CHART_TYPE_ICONS[ChartType]][]).map(([type, config]) => {
              const Icon = config.icon;
              const isActive = effectiveType === type;
              return (
                <Button
                  key={type}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLocalType(type === parsedData?.type ? null : type)}
                  className={`h-7 w-7 p-0 ${isActive ? '' : 'hover:bg-muted'}`}
                  title={config.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              );
            })}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Baixar
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border border-border">
              <DropdownMenuItem onClick={handleDownloadPng}>
                <FileImage className="h-4 w-4 mr-2" />
                PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            className="bg-background/80 backdrop-blur-sm"
            title="Copiar para área de transferência"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreviewShare('whatsapp')}
            className="bg-background/80 backdrop-blur-sm"
            title="Compartilhar no WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreviewShare('email')}
            className="bg-background/80 backdrop-blur-sm"
            title="Compartilhar por Email"
          >
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Gráfico
            </DialogTitle>
            <DialogDescription>
              Visualize como ficará o arquivo antes de compartilhar
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg overflow-hidden bg-[#1a1a2e] p-4 max-h-[400px] overflow-auto">
                <img 
                  src={previewData.dataUrl} 
                  alt="Preview" 
                  className="max-w-full h-auto mx-auto"
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileImage className="h-4 w-4" />
                  PNG
                </span>
                <span>
                  📐 {Math.round(previewData.width)} x {Math.round(previewData.height)}px
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmShare}>
              {pendingAction === 'whatsapp' && <MessageCircle className="h-4 w-4 mr-2" />}
              {pendingAction === 'email' && <Mail className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
