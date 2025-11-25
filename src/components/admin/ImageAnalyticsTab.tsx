import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImageAnalytics } from "@/hooks/useImageAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Image, CheckCircle, XCircle, Database, Clock } from "lucide-react";

export const ImageAnalyticsTab = () => {
  const { data: analytics, isLoading, error } = useImageAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Erro ao carregar analytics de imagens: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!analytics) return null;

  const sectionChartData = Object.entries(analytics.bySection).map(([section, data]) => ({
    section: section.replace('tooltip-', 'T: ').substring(0, 20),
    success: data.success,
    failures: data.failures,
    avgTime: Math.round(data.avgTime / 1000), // Converter para segundos
  }));

  return (
    <div className="space-y-6">
      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gerado</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalGenerated}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalSuccess} sucesso, {analytics.totalFailures} falhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalSuccess} de {analytics.totalGenerated} gerações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.cacheHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.cacheHits} imagens do cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.averageGenerationTime / 1000).toFixed(1)}s
            </div>
            <p className="text-xs text-muted-foreground">Por imagem gerada</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance por Seção */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Seção</CardTitle>
          <CardDescription>Sucesso, falhas e tempo médio de geração por seção</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="section" angle={-45} textAnchor="end" height={100} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="success" fill="hsl(var(--primary))" name="Sucesso" />
              <Bar yAxisId="left" dataKey="failures" fill="hsl(var(--destructive))" name="Falhas" />
              <Bar yAxisId="right" dataKey="avgTime" fill="hsl(var(--accent))" name="Tempo Médio (s)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance ao Longo do Tempo */}
      {analytics.performanceOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance ao Longo do Tempo</CardTitle>
            <CardDescription>Últimos 7 dias - Tempo médio e quantidade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  name="Quantidade"
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="avgTime" 
                  stroke="hsl(var(--accent))" 
                  name="Tempo Médio (ms)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Erros Recentes */}
      {analytics.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Erros Recentes</CardTitle>
            <CardDescription>Últimos 10 erros de geração de imagens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.recentErrors.map((error, idx) => (
                <Alert key={idx} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">{error.section_id}</span> - {error.prompt_key}
                    <br />
                    <span className="text-xs">{error.error_message}</span>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {new Date(error.created_at).toLocaleString('pt-BR')}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
