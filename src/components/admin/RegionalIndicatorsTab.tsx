import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, TrendingUp, TrendingDown, Users, Heart, Baby, Globe } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell } from "recharts";

interface BrazilianUF {
  id: string;
  uf_code: number;
  uf_sigla: string;
  uf_name: string;
  region_code: string;
  region_name: string;
  capital: string;
}

interface RegionalValue {
  id: string;
  indicator_id: string;
  uf_code: number;
  reference_date: string;
  value: number;
}

interface Indicator {
  id: string;
  name: string;
  code: string;
  unit: string;
  is_regional: boolean;
}

const REGION_COLORS: Record<string, string> = {
  'N': '#10B981',   // Norte - verde
  'NE': '#F59E0B',  // Nordeste - laranja
  'SE': '#3B82F6',  // Sudeste - azul
  'S': '#8B5CF6',   // Sul - roxo
  'CO': '#EF4444',  // Centro-Oeste - vermelho
};

const REGION_NAMES: Record<string, string> = {
  'N': 'Norte',
  'NE': 'Nordeste',
  'SE': 'Sudeste',
  'S': 'Sul',
  'CO': 'Centro-Oeste',
};

export function RegionalIndicatorsTab() {
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'states' | 'regions'>('states');

  // Fetch UFs
  const { data: ufs = [], isLoading: loadingUFs } = useQuery({
    queryKey: ['brazilian-ufs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brazilian_ufs')
        .select('*')
        .order('uf_sigla');
      if (error) throw error;
      return data as BrazilianUF[];
    }
  });

  // Fetch regional indicators
  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['regional-indicators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('economic_indicators')
        .select('id, name, code, unit, is_regional')
        .eq('is_regional', true)
        .order('name');
      if (error) throw error;
      return data as Indicator[];
    }
  });

  // Fetch regional values for selected indicator
  const { data: regionalValues = [], isLoading: loadingValues } = useQuery({
    queryKey: ['regional-values', selectedIndicator],
    queryFn: async () => {
      if (!selectedIndicator) return [];
      const { data, error } = await supabase
        .from('indicator_regional_values')
        .select('*')
        .eq('indicator_id', selectedIndicator)
        .order('reference_date', { ascending: false });
      if (error) throw error;
      return data as RegionalValue[];
    },
    enabled: !!selectedIndicator
  });

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    regionalValues.forEach(v => {
      const year = v.reference_date.substring(0, 4);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [regionalValues]);

  // Set default year when data loads
  useMemo(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Filter values by year and merge with UFs
  const chartData = useMemo(() => {
    if (!selectedYear || !ufs.length) return [];

    const yearValues = regionalValues.filter(v => 
      v.reference_date.startsWith(selectedYear)
    );

    if (viewMode === 'states') {
      return ufs.map(uf => {
        const value = yearValues.find(v => v.uf_code === uf.uf_code);
        return {
          uf_sigla: uf.uf_sigla,
          uf_name: uf.uf_name,
          region_code: uf.region_code,
          region_name: uf.region_name,
          value: value?.value || 0,
          color: REGION_COLORS[uf.region_code] || '#666'
        };
      }).sort((a, b) => b.value - a.value);
    } else {
      // Group by region
      const regionData: Record<string, { total: number; count: number; region_name: string }> = {};
      
      ufs.forEach(uf => {
        if (!regionData[uf.region_code]) {
          regionData[uf.region_code] = { total: 0, count: 0, region_name: uf.region_name };
        }
        const value = yearValues.find(v => v.uf_code === uf.uf_code);
        if (value) {
          regionData[uf.region_code].total += value.value;
          regionData[uf.region_code].count += 1;
        }
      });

      return Object.entries(regionData).map(([code, data]) => ({
        uf_sigla: code,
        uf_name: REGION_NAMES[code],
        region_code: code,
        region_name: data.region_name,
        value: data.count > 0 ? data.total / data.count : 0,
        color: REGION_COLORS[code] || '#666'
      })).sort((a, b) => b.value - a.value);
    }
  }, [regionalValues, selectedYear, ufs, viewMode]);

  // Statistics
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const values = chartData.map(d => d.value).filter(v => v > 0);
    if (!values.length) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxItem = chartData.find(d => d.value === max);
    const minItem = chartData.find(d => d.value === min);

    return { avg, max, min, maxItem, minItem, count: values.length };
  }, [chartData]);

  const selectedIndicatorData = indicators.find(i => i.id === selectedIndicator);

  const isLoading = loadingUFs || loadingIndicators || loadingValues;

  const getIndicatorIcon = (code: string) => {
    if (code.includes('POP')) return <Users className="h-4 w-4" />;
    if (code.includes('ESPERANCA') || code.includes('VIDA')) return <Heart className="h-4 w-4" />;
    if (code.includes('TMI') || code.includes('FECUND')) return <Baby className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Indicadores Regionais por UF
        </h2>
        <p className="text-muted-foreground mt-1">
          Visualização de indicadores demográficos e de saúde por estado brasileiro
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="w-64">
            <label className="text-sm text-muted-foreground mb-1 block">Indicador</label>
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um indicador" />
              </SelectTrigger>
              <SelectContent>
                {indicators.map(ind => (
                  <SelectItem key={ind.id} value={ind.id}>
                    <span className="flex items-center gap-2">
                      {getIndicatorIcon(ind.code)}
                      {ind.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <label className="text-sm text-muted-foreground mb-1 block">Ano</label>
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!availableYears.length}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="text-sm text-muted-foreground mb-1 block">Visualização</label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'states' | 'regions')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="states">Por Estado</SelectItem>
                <SelectItem value="regions">Por Região</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && selectedIndicatorData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Média</div>
              <div className="text-2xl font-bold">{stats.avg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">{selectedIndicatorData.unit}</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Maior Valor
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">{stats.maxItem?.uf_name}</div>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Menor Valor
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">{stats.minItem?.uf_name}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Estados com dados</div>
              <div className="text-2xl font-bold">{stats.count}</div>
              <div className="text-xs text-muted-foreground">de {ufs.length} estados</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {selectedIndicator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedIndicatorData && getIndicatorIcon(selectedIndicatorData.code)}
              {selectedIndicatorData?.name || 'Indicador'}
              <Badge variant="outline" className="ml-2">{selectedYear}</Badge>
            </CardTitle>
            <CardDescription>
              {viewMode === 'states' ? 'Valores por estado' : 'Média por região'}
              {selectedIndicatorData && ` (${selectedIndicatorData.unit})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Globe className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhum dado disponível para este indicador.</p>
                <p className="text-sm">Sincronize os dados na aba "Gestão de APIs".</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={viewMode === 'states' ? 600 : 300}>
                <BarChart 
                  data={chartData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                  <YAxis 
                    type="category" 
                    dataKey="uf_sigla" 
                    width={50}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), 'Valor']}
                    labelFormatter={(label) => chartData.find(d => d.uf_sigla === label)?.uf_name || label}
                  />
                  <Legend />
                  <Bar dataKey="value" name={selectedIndicatorData?.unit || 'Valor'} radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {selectedIndicator && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Legenda por Região</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(REGION_COLORS).map(([code, color]) => (
              <div key={code} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm">{REGION_NAMES[code]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!selectedIndicator && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Selecione um indicador</p>
            <p className="text-sm">Escolha um indicador demográfico ou de saúde para visualizar os dados por estado.</p>
            {indicators.length === 0 && !loadingIndicators && (
              <Badge variant="outline" className="mt-4">
                Nenhum indicador regional cadastrado
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
