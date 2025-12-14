import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Loader2, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

// UF code to sigla mapping
const UF_CODE_MAP: Record<number, string> = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
  28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

const UF_SIGLA_TO_CODE: Record<string, number> = Object.fromEntries(
  Object.entries(UF_CODE_MAP).map(([k, v]) => [v, parseInt(k)])
);

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

interface StateDataPanelProps {
  ufSigla: string;
  researchId: string | null;
  onClose: () => void;
}

export function StateDataPanel({ ufSigla, researchId, onClose }: StateDataPanelProps) {
  const ufCode = UF_SIGLA_TO_CODE[ufSigla];
  const ufName = UF_NAMES[ufSigla] || ufSigla;

  // Fetch regional data for the selected state and research
  const { data: regionalData, isLoading } = useQuery({
    queryKey: ["regional-data-state", ufCode, researchId],
    queryFn: async () => {
      if (!researchId || !ufCode) return [];
      
      // First get indicators linked to this API
      const { data: indicators } = await supabase
        .from("economic_indicators")
        .select("id, name, unit")
        .eq("api_id", researchId);
      
      if (!indicators || indicators.length === 0) return [];
      
      const indicatorIds = indicators.map((i) => i.id);
      
      // Then get regional values for this UF
      const { data: values, error } = await supabase
        .from("indicator_regional_values")
        .select("indicator_id, reference_date, value")
        .eq("uf_code", ufCode)
        .in("indicator_id", indicatorIds)
        .order("reference_date", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Merge with indicator names
      return (values || []).map((v) => {
        const ind = indicators.find((i) => i.id === v.indicator_id);
        return {
          ...v,
          indicatorName: ind?.name || "Desconhecido",
          unit: ind?.unit || "",
        };
      });
    },
    enabled: !!researchId && !!ufCode,
  });

  // Calculate trend
  const getTrend = (values: typeof regionalData) => {
    if (!values || values.length < 2) return "stable";
    const recent = values[0]?.value || 0;
    const previous = values[1]?.value || 0;
    if (recent > previous) return "up";
    if (recent < previous) return "down";
    return "stable";
  };

  const trend = getTrend(regionalData);

  return (
    <Card className="border-2 border-[#00FFFF]/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FF00FF]/20 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-[#FF00FF]" />
          </div>
          <div>
            <CardTitle className="text-lg">{ufName}</CardTitle>
            <Badge variant="outline" className="mt-1">{ufSigla}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        {!researchId ? (
          <p className="text-muted-foreground text-center py-4">
            Selecione uma pesquisa regional acima
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !regionalData || regionalData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum dado disponível para este estado
          </p>
        ) : (
          <div className="space-y-4">
            {/* Trend indicator */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              {trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
              {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
              {trend === "stable" && <Minus className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-medium">
                {trend === "up" && "Tendência de alta"}
                {trend === "down" && "Tendência de baixa"}
                {trend === "stable" && "Estável"}
              </span>
            </div>

            {/* Data table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Indicador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionalData.slice(0, 10).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">
                      {format(new Date(item.reference_date), "MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[200px]">
                      {item.indicatorName}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      {item.unit && <span className="text-muted-foreground ml-1">{item.unit}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {regionalData.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 10 de {regionalData.length} registros
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
