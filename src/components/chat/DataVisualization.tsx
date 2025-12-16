import React, { useMemo, useState } from "react";
import { 
  FileSpreadsheet, 
  Download, 
  ChevronUp, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  ScatterChart,
  Line,
  Bar,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { summary, linearRegression } from "@/lib/mathUtils";
import { exportData } from "@/lib/export-utils";

interface DataVisualizationProps {
  data: any[];
  columns: string[];
  fileName: string;
}

type ChartType = "line" | "bar" | "area" | "scatter";
type SortDirection = "asc" | "desc" | null;

const ROWS_PER_PAGE = 100;

export const DataVisualization = ({ data, columns, fileName }: DataVisualizationProps) => {
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Chart state
  const [xColumn, setXColumn] = useState<string>(columns[0] || "");
  const [yColumn, setYColumn] = useState<string>(columns[1] || columns[0] || "");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showTrendLine, setShowTrendLine] = useState(false);

  // Detect numeric columns
  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      const values = data.map((row) => row[col]).filter((v) => v != null);
      return values.length > 0 && values.every((v) => !isNaN(Number(v)));
    });
  }, [data, columns]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

  // Chart data
  const chartData = useMemo(() => {
    if (!xColumn || !yColumn) return [];

    return data
      .map((row, index) => ({
        x: row[xColumn] ?? index,
        y: Number(row[yColumn]) || 0,
        name: String(row[xColumn] ?? index),
      }))
      .filter((d) => !isNaN(d.y));
  }, [data, xColumn, yColumn]);

  // Trend line calculation
  const trendLineData = useMemo(() => {
    if (!showTrendLine || chartData.length < 2) return null;

    const xValues = chartData.map((_, i) => i);
    const yValues = chartData.map((d) => d.y);
    const regression = linearRegression(xValues, yValues);

    return {
      slope: regression.slope,
      intercept: regression.intercept,
      startY: regression.intercept,
      endY: regression.slope * (chartData.length - 1) + regression.intercept,
    };
  }, [chartData, showTrendLine]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Export handler
  const handleExport = () => {
    exportData({
      filename: fileName.replace(/\.[^/.]+$/, ""),
      data,
      format: "csv",
      columns: columns.map((col) => ({ key: col, label: col })),
    });
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const chartComponents = {
      line: (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#00CED1"
            strokeWidth={2}
            dot={{ fill: "#00CED1", r: 3 }}
          />
          {trendLineData && (
            <ReferenceLine
              segment={[
                { x: chartData[0]?.name, y: trendLineData.startY },
                { x: chartData[chartData.length - 1]?.name, y: trendLineData.endY },
              ]}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          )}
        </LineChart>
      ),
      bar: (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="y" fill="#00CED1" radius={[4, 4, 0, 0]} />
        </BarChart>
      ),
      area: (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke="#00CED1"
            fill="rgba(0,206,209,0.2)"
          />
        </AreaChart>
      ),
      scatter: (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,206,209,0.1)" />
          <XAxis dataKey="x" stroke="#94a3b8" fontSize={12} name={xColumn} />
          <YAxis dataKey="y" stroke="#94a3b8" fontSize={12} name={yColumn} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(0,206,209,0.3)",
              borderRadius: "8px",
            }}
          />
          <Scatter dataKey="y" fill="#00CED1" />
        </ScatterChart>
      ),
    };

    return chartComponents[chartType];
  };

  return (
    <div className="w-full min-w-0 overflow-x-auto bg-slate-900/50 border border-cyan-500/20 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/20 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">{fileName}</span>
          <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300 text-xs">
            {data.length} registros • {columns.length} colunas
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tabela" className="w-full">
        <TabsList className="w-full justify-start bg-slate-800/30 border-b border-cyan-500/20 rounded-none p-1 overflow-x-auto">
          <TabsTrigger
            value="tabela"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Tabela
          </TabsTrigger>
          <TabsTrigger
            value="estatisticas"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Estatísticas
          </TabsTrigger>
          <TabsTrigger
            value="grafico"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
          >
            Gráfico
          </TabsTrigger>
        </TabsList>

        {/* Tab: Tabela */}
        <TabsContent value="tabela" className="m-0">
          <ScrollArea className="max-h-[350px]">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-500/20 hover:bg-transparent">
                      {columns.map((col) => (
                        <TableHead
                          key={col}
                          onClick={() => handleSort(col)}
                          className="text-cyan-400 cursor-pointer hover:text-cyan-300 whitespace-nowrap text-xs px-2"
                        >
                          <div className="flex items-center gap-1">
                            {col}
                            {sortColumn === col && (
                              sortDirection === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, idx) => (
                      <TableRow key={idx} className="border-cyan-500/10 hover:bg-cyan-500/5">
                        {columns.map((col) => (
                          <TableCell key={col} className="text-slate-300 text-xs px-2 truncate max-w-[150px]">
                            {row[col] ?? "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-cyan-500/20 bg-slate-800/30">
              <span className="text-xs text-slate-400">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Estatísticas */}
        <TabsContent value="estatisticas" className="m-0 p-4">
          {numericColumns.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Nenhuma coluna numérica encontrada
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {numericColumns.map((col) => {
                const values = data.map((row) => Number(row[col])).filter((v) => !isNaN(v));
                const stats = summary(values);

                return (
                  <div
                    key={col}
                    className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3"
                  >
                    <h4 className="text-cyan-400 font-medium text-sm mb-2 truncate">
                      {col}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Contagem:</span>
                        <span className="text-slate-300 ml-1">{stats.count}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Média:</span>
                        <span className="text-slate-300 ml-1">{stats.mean.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mediana:</span>
                        <span className="text-slate-300 ml-1">{stats.median.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Desvio:</span>
                        <span className="text-slate-300 ml-1">{stats.std.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mín:</span>
                        <span className="text-slate-300 ml-1">{stats.min.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Máx:</span>
                        <span className="text-slate-300 ml-1">{stats.max.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Gráfico */}
        <TabsContent value="grafico" className="m-0 p-4 overflow-hidden">
          {/* Chart Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="w-full">
              <label className="text-xs text-slate-400 mb-1 block">Eixo X</label>
              <Select value={xColumn} onValueChange={setXColumn}>
                <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/20">
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="text-xs text-slate-400 mb-1 block">Eixo Y</label>
              <Select value={yColumn} onValueChange={setYColumn}>
                <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/20">
                  {numericColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="bg-slate-800/50 border-cyan-500/20 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/20">
                  <SelectItem value="line">Linha</SelectItem>
                  <SelectItem value="bar">Barra</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="scatter">Scatter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-2 md:col-span-1">
              <Button
                variant={showTrendLine ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTrendLine(!showTrendLine)}
                className={showTrendLine 
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                  : "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                }
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Tendência
              </Button>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[350px] bg-slate-800/30 rounded-lg border border-cyan-500/10 p-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Selecione as colunas para visualizar o gráfico
              </div>
            )}
          </div>

          {/* Trend line info */}
          {showTrendLine && trendLineData && (
            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Regressão Linear: y = {trendLineData.slope.toFixed(4)}x + {trendLineData.intercept.toFixed(4)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
