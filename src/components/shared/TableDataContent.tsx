import { 
  Loader2,
  Calendar,
  MapPin,
  Database,
  ArrowLeft
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateByFrequency } from "@/lib/date-formatters";

interface IndicatorValueWithUF {
  reference_date: string;
  value: number;
  brazilian_ufs?: { uf_name: string; uf_sigla: string } | null;
}

interface TableDataContentProps {
  onBack: () => void;
  indicatorName: string;
  indicatorCode: string;
  isRegional: boolean;
  data: IndicatorValueWithUF[];
  unit: string | null;
  frequency: string | null;
  isLoading: boolean;
  isMonetaryMode?: boolean; // Flag to indicate R$ mode with large values
}

const FREQUENCIES: Record<string, string> = {
  daily: "Diária",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

// Format large monetary values in millions/billions
function formatLargeMonetaryValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bi`;
  }
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mi`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mil`;
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTableValue(value: number, unit: string | null, isMonetaryMode?: boolean): string {
  // If in monetary mode, use large value formatting
  if (isMonetaryMode) {
    return formatLargeMonetaryValue(value);
  }

  const u = (unit || "").toLowerCase();

  if (u.includes("%")) {
    return `${value.toFixed(2)}%`;
  }

  if (u.includes("r$") || u.includes("mil") || u.includes("reais") || u === "brl") {
    return formatLargeMonetaryValue(value);
  }

  if (u.includes("us$") || u.includes("usd") || u.includes("dólar") || u.includes("dollar")) {
    return `$ ${value.toFixed(2)}`;
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TableDataContent({
  onBack,
  indicatorName,
  indicatorCode,
  isRegional,
  data,
  unit,
  frequency,
  isLoading,
  isMonetaryMode = false,
}: TableDataContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-cyan-500/20 bg-[#0D0D12]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={cn(
                "flex items-center gap-2 px-3 py-2",
                "bg-cyan-500/10 hover:bg-cyan-500/20",
                "border border-cyan-500/30 hover:border-cyan-500/50",
                "rounded-lg transition-all duration-200 text-white"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-500" />
              <h3 className="text-lg font-semibold text-white">{indicatorName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{indicatorCode}</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {FREQUENCIES[frequency || ""] || frequency || "-"}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {isRegional ? "Por UF" : "Brasil"}
            </div>
            <Badge variant="outline" className="text-xs">
              {data.length} registros
            </Badge>
          </div>
        </div>
      </div>

      {/* Table Content - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-cyan-500/20 rounded-md">
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
                    <TableCell
                      colSpan={isRegional ? 4 : 3}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum valor encontrado para este indicador.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, idx) => (
                    <TableRow
                      key={idx}
                      className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors"
                    >
                      <TableCell className="font-mono text-sm text-white">
                        {formatDateByFrequency(item.reference_date, frequency)}
                      </TableCell>
                      {isRegional && (
                        <TableCell className="font-semibold text-sm text-white">
                          {item.brazilian_ufs?.uf_sigla || "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-mono text-white">
                        {formatTableValue(Number(item.value), unit, isMonetaryMode)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {indicatorName}
                        {!isRegional && " - Brasil"}
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
  );
}

export default TableDataContent;
