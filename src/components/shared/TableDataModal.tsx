import { 
  X, 
  Loader2,
  Calendar,
  MapPin,
  Database
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { formatDateByFrequency } from '@/lib/date-formatters';

interface IndicatorValueWithUF {
  reference_date: string;
  value: number;
  brazilian_ufs?: { uf_name: string; uf_sigla: string } | null;
}

interface TableDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorName: string;
  indicatorCode: string;
  isRegional: boolean;
  data: IndicatorValueWithUF[];
  unit: string | null;
  frequency: string | null;
  isLoading: boolean;
}

const FREQUENCIES: Record<string, string> = {
  daily: "Diária",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

function formatTableValue(value: number, unit: string | null): string {
  const u = (unit || '').toLowerCase();
  
  if (u.includes('%')) {
    return `${value.toFixed(2)}%`;
  }
  
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return `$ ${value.toFixed(2)}`;
  }
  
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function TableDataModal({
  isOpen,
  onClose,
  indicatorName,
  indicatorCode,
  isRegional,
  data,
  unit,
  frequency,
  isLoading,
}: TableDataModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
        <div 
          className={cn(
            "relative w-full max-w-4xl h-[85vh]",
            "bg-[#0A0A0F] border border-cyan-500/30",
            "rounded-xl shadow-2xl shadow-cyan-500/10",
            "overflow-hidden flex flex-col"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-cyan-500/20 bg-[#0D0D12] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-cyan-500" />
              <div>
                <h3 className="text-lg font-semibold text-white">{indicatorName}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="font-mono">{indicatorCode}</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {FREQUENCIES[frequency || ''] || frequency || '-'}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {isRegional ? 'Por UF' : 'Brasil'}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {data.length} registros
                  </Badge>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "w-10 h-10 rounded-full",
                "border border-cyan-500/30",
                "flex items-center justify-center",
                "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
                "transition-all duration-200"
              )}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Table Content - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-[#0A0A0F]">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border border-cyan-500/20 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-[#0D0D12] z-10">
                    <TableRow>
                      <TableHead className="text-cyan-400">Data</TableHead>
                      {isRegional && (
                        <TableHead className="text-cyan-400">UF</TableHead>
                      )}
                      <TableHead className="text-right text-cyan-400">Valor</TableHead>
                      <TableHead className="text-cyan-400">Indicador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isRegional ? 4 : 3} className="text-center text-muted-foreground py-8">
                          Nenhum valor encontrado para este indicador.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors">
                          <TableCell className="font-mono text-sm text-white">
                            {formatDateByFrequency(item.reference_date, frequency)}
                          </TableCell>
                          {isRegional && (
                            <TableCell className="font-semibold text-sm text-white">
                              {item.brazilian_ufs?.uf_sigla || '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-right font-mono text-white">
                            {formatTableValue(Number(item.value), unit)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {indicatorName}
                            {!isRegional && ' - Brasil'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default TableDataModal;
