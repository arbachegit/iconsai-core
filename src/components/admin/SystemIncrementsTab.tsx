import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Activity, Search, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const operationTypeColors: Record<string, string> = {
  INSERT: "bg-green-500/20 text-green-700 border-green-500/50",
  UPDATE: "bg-blue-500/20 text-blue-700 border-blue-500/50",
  DELETE: "bg-red-500/20 text-red-700 border-red-500/50",
  BULK_INSERT: "bg-purple-500/20 text-purple-700 border-purple-500/50"
};

export const SystemIncrementsTab = () => {
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'timestamp' | 'triggered_by_email' | 'operation_type' | 'operation_source'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: increments, isLoading } = useQuery({
    queryKey: ["system-increments", operationFilter, sourceFilter, searchTerm, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("system_increments")
        .select("*")
        .order("timestamp", { ascending: false });

      if (operationFilter !== "all") {
        query = query.eq("operation_type", operationFilter);
      }

      if (sourceFilter !== "all") {
        query = query.eq("operation_source", sourceFilter);
      }

      if (dateFrom) {
        query = query.gte("timestamp", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte("timestamp", new Date(dateTo).toISOString());
      }

      if (searchTerm) {
        query = query.or(`summary.ilike.%${searchTerm}%,triggered_by_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [operationFilter, sourceFilter, searchTerm, dateFrom, dateTo]);

  // Sort data
  const sortedIncrements = useMemo(() => {
    if (!increments) return [];
    return [...increments].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
  }, [increments, sortField, sortDirection]);

  // Calculate operation stats for pie chart
  const operationStats = useMemo(() => {
    if (!increments) return [];
    const counts = increments.reduce((acc, inc) => {
      acc[inc.operation_type] = (acc[inc.operation_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { name: 'INSERT', value: counts['INSERT'] || 0, color: '#22c55e' },
      { name: 'UPDATE', value: counts['UPDATE'] || 0, color: '#3b82f6' },
      { name: 'DELETE', value: counts['DELETE'] || 0, color: '#ef4444' },
      { name: 'BULK_INSERT', value: counts['BULK_INSERT'] || 0, color: '#a855f7' },
    ].filter(item => item.value > 0);
  }, [increments]);

  // Pagination
  const totalPages = Math.ceil(sortedIncrements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncrements = sortedIncrements.slice(startIndex, startIndex + itemsPerPage);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    if (!increments || increments.length === 0) return;

    const headers = ["Data/Hora", "Usuário", "Operação", "Fonte", "Tabelas Afetadas", "Resumo"];
    const rows = increments.map(inc => [
      format(new Date(inc.timestamp), "dd/MM/yyyy HH:mm:ss"),
      inc.triggered_by_email,
      inc.operation_type,
      inc.operation_source,
      inc.tables_affected.join(", "),
      inc.summary
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `incrementos-sistema-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Incrementos do Sistema</CardTitle>
                <CardDescription>
                  Rastreamento de mudanças nas tabelas do banco de dados
                </CardDescription>
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pie Chart */}
            {operationStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição de Operações</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={operationStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {operationStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Operações</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="BULK_INSERT">BULK_INSERT</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Fontes</SelectItem>
                  <SelectItem value="document_upload">Upload Documento</SelectItem>
                  <SelectItem value="tag_suggestion">Sugestão Tags</SelectItem>
                  <SelectItem value="tag_manual">Tag Manual</SelectItem>
                  <SelectItem value="config_update">Config Chat</SelectItem>
                  <SelectItem value="pronunciation_update">Pronúncia</SelectItem>
                  <SelectItem value="content_update">Conteúdo</SelectItem>
                  <SelectItem value="tooltip_update">Tooltip</SelectItem>
                  <SelectItem value="image_generation">Geração Imagem</SelectItem>
                  <SelectItem value="version_increment">Versão</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Data De"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Data Até"
              />

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-8"
                />
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => toggleSort('timestamp')}
                      >
                        <div className="flex items-center gap-2">
                          Data/Hora
                          <ArrowUpDown className={cn("h-4 w-4", sortField === 'timestamp' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => toggleSort('triggered_by_email')}
                      >
                        <div className="flex items-center gap-2">
                          Usuário
                          <ArrowUpDown className={cn("h-4 w-4", sortField === 'triggered_by_email' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => toggleSort('operation_type')}
                      >
                        <div className="flex items-center gap-2">
                          Operação
                          <ArrowUpDown className={cn("h-4 w-4", sortField === 'operation_type' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => toggleSort('operation_source')}
                      >
                        <div className="flex items-center gap-2">
                          Fonte
                          <ArrowUpDown className={cn("h-4 w-4", sortField === 'operation_source' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead>Tabelas Afetadas</TableHead>
                      <TableHead>Resumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Carregando incrementos...
                        </TableCell>
                      </TableRow>
                    ) : paginatedIncrements.length > 0 ? (
                      paginatedIncrements.map((inc) => (
                        <Collapsible
                          key={inc.id}
                          open={expandedRowId === inc.id}
                          onOpenChange={() => setExpandedRowId(expandedRowId === inc.id ? null : inc.id)}
                        >
                          <TableRow>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ChevronDown 
                                    className={cn(
                                      "h-4 w-4 transition-transform", 
                                      expandedRowId === inc.id && "rotate-180"
                                    )} 
                                  />
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(inc.timestamp), "dd/MM/yyyy HH:mm:ss")}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {inc.triggered_by_email}
                            </TableCell>
                            <TableCell>
                              <Badge className={operationTypeColors[inc.operation_type]}>
                                {inc.operation_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {inc.operation_source}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {inc.tables_affected.map((table: string) => (
                                  <Badge key={table} variant="outline" className="text-xs">
                                    {table}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{inc.summary}</TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={7}>
                                <div className="p-4 bg-muted/30 rounded-lg">
                                  <p className="text-sm font-semibold mb-2">Detalhes:</p>
                                  <pre className="text-xs font-mono overflow-auto max-h-60 bg-background p-3 rounded border">
                                    {JSON.stringify(inc.details, null, 2)}
                                  </pre>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhum incremento encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls */}
            {paginatedIncrements.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Itens por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedIncrements.length)} de {sortedIncrements.length}
                  </span>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
