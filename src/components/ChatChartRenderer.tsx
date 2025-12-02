import { useMemo, useRef } from 'react';
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
import { Download, FileImage, FileText, MessageCircle, Mail, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  const parsedData = useMemo(() => {
    try {
      return JSON.parse(chartData) as ChartData;
    } catch {
      console.error('Failed to parse chart data:', chartData);
      return null;
    }
  }, [chartData]);

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

  // Share to WhatsApp
  const handleShareWhatsApp = async () => {
    const result = await getChartAsImage(chartRef);
    
    if (result && navigator.share && navigator.canShare) {
      const file = new File([result.blob], `${filename}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: parsedData?.title || 'Gráfico KnowYOU',
            files: [file],
          });
          return;
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Share failed:', err);
          }
        }
      }
    }
    
    // Fallback: open WhatsApp with message
    const text = encodeURIComponent(`📊 ${parsedData?.title || 'Gráfico'} - Gerado por KnowYOU`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.info('Abra o WhatsApp para compartilhar');
  };

  // Share via Email
  const handleShareEmail = async () => {
    const result = await getChartAsImage(chartRef);
    
    if (result && navigator.share && navigator.canShare) {
      const file = new File([result.blob], `${filename}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: parsedData?.title || 'Gráfico KnowYOU',
            files: [file],
          });
          return;
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Share failed:', err);
          }
        }
      }
    }
    
    // Fallback: mailto
    const subject = encodeURIComponent(`Gráfico: ${parsedData?.title || 'KnowYOU'}`);
    const body = encodeURIComponent('Segue o gráfico gerado pelo KnowYOU.');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!parsedData || !parsedData.data || parsedData.data.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        Erro ao renderizar gráfico
      </div>
    );
  }

  const { type, title, data, xKey = 'name', dataKeys = ['value'], colors = COLORS } = parsedData;

  const renderChart = () => {
    switch (type) {
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
    <div className="my-4 p-4 bg-card/50 border border-border rounded-lg relative group">
      {title && (
        <h4 className="text-sm font-semibold text-foreground mb-3 text-center">{title}</h4>
      )}
      <div ref={chartRef}>
        {renderChart()}
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
          <DropdownMenuContent align="end">
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
          onClick={handleShareWhatsApp}
          className="bg-background/80 backdrop-blur-sm"
          title="Compartilhar no WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleShareEmail}
          className="bg-background/80 backdrop-blur-sm"
          title="Compartilhar por Email"
        >
          <Mail className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
