import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Activity, Search } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Tabelas Afetadas</TableHead>
                      <TableHead>Resumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Carregando incrementos...
                        </TableCell>
                      </TableRow>
                    ) : increments && increments.length > 0 ? (
                      increments.map((inc) => (
                        <TableRow key={inc.id}>
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum incremento encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {increments && increments.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: {increments.length} incremento{increments.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
