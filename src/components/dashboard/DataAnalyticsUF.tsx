import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Search } from "lucide-react";
import { BrazilMap } from "./BrazilMap";
import { StateDataPanel } from "./StateDataPanel";
import { RegionalStatesHeader } from "./RegionalStatesHeader";
import { useDashboardAnalyticsSafe } from "@/contexts/DashboardAnalyticsContext";

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

export function DataAnalyticsUF() {
  const [selectedResearch, setSelectedResearch] = useState<string>("none");
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const dashboardAnalytics = useDashboardAnalyticsSafe();

  // Fetch regional APIs
  const { data: regionalApis, isLoading } = useQuery({
    queryKey: ["regional-apis-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_api_registry")
        .select("id, name")
        .eq("target_table", "indicator_regional_values")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all Brazilian UFs
  const { data: allUfs } = useQuery({
    queryKey: ["brazilian-ufs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brazilian_ufs")
        .select("uf_sigla, uf_name, region_code, uf_code")
        .order("uf_sigla");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch API to UF mapping for search filtering
  const { data: apiUfMapping } = useQuery({
    queryKey: ["api-uf-mapping", regionalApis?.length],
    queryFn: async () => {
      const mapping: Record<string, string[]> = {};
      
      for (const api of regionalApis || []) {
        const { data: indicators } = await supabase
          .from("economic_indicators")
          .select("id")
          .eq("api_id", api.id);
        
        const indicatorIds = indicators?.map(i => i.id) || [];
        if (indicatorIds.length === 0) continue;
        
        const { data: values } = await supabase
          .from("indicator_regional_values")
          .select("uf_code")
          .in("indicator_id", indicatorIds);
        
        const ufCodes = [...new Set(values?.map(v => v.uf_code) || [])];
        const siglas = (allUfs || [])
          .filter(uf => ufCodes.includes(uf.uf_code))
          .map(uf => uf.uf_sigla);
        
        mapping[api.id] = siglas;
      }
      
      return mapping;
    },
    enabled: !!regionalApis?.length && !!allUfs?.length,
  });

  // Filter APIs based on search term
  const filteredApis = useMemo(() => {
    if (!searchTerm.trim()) return regionalApis || [];
    
    const term = searchTerm.toLowerCase().trim();
    
    return (regionalApis || []).filter(api => {
      // Search by API name (product)
      if (api.name.toLowerCase().includes(term)) return true;
      
      // Search by state (sigla or name)
      const apiStates = apiUfMapping?.[api.id] || [];
      const matchesState = apiStates.some(sigla => {
        const uf = allUfs?.find(u => u.uf_sigla === sigla);
        return sigla.toLowerCase().includes(term) || 
               uf?.uf_name.toLowerCase().includes(term);
      });
      
      return matchesState;
    });
  }, [searchTerm, regionalApis, apiUfMapping, allUfs]);

  // Auto-select first matching API while typing
  useEffect(() => {
    if (filteredApis.length > 0 && searchTerm.trim()) {
      const firstMatch = filteredApis[0];
      if (firstMatch && selectedResearch !== firstMatch.id) {
        setSelectedResearch(firstMatch.id);
      }
    }
  }, [filteredApis, searchTerm]);

  // Fetch available UF codes for selected research
  const { data: availableUfCodes } = useQuery({
    queryKey: ["available-ufs", selectedResearch],
    queryFn: async () => {
      if (selectedResearch === "none") return [];
      
      const { data: indicators } = await supabase
        .from("economic_indicators")
        .select("id")
        .eq("api_id", selectedResearch);
      
      const indicatorIds = indicators?.map(i => i.id) || [];
      if (indicatorIds.length === 0) return [];
      
      const { data: values } = await supabase
        .from("indicator_regional_values")
        .select("uf_code")
        .in("indicator_id", indicatorIds);
      
      return [...new Set(values?.map(v => v.uf_code) || [])];
    },
    enabled: selectedResearch !== "none",
  });

  // Map UF codes to siglas
  const availableSiglas = (allUfs || [])
    .filter(uf => (availableUfCodes || []).includes(uf.uf_code))
    .map(uf => uf.uf_sigla);

  const isMapDisabled = selectedResearch === "none";

  // Update selectedUF only - StateDataPanel is responsible for full context with data
  useEffect(() => {
    if (dashboardAnalytics) {
      if (selectedState && selectedResearch !== "none") {
        dashboardAnalytics.setSelectedUF(selectedState);
        // Don't set regionalContext here - StateDataPanel will do it with complete data
      } else {
        dashboardAnalytics.setSelectedUF(null);
        dashboardAnalytics.setRegionalContext(null);
      }
    }
  }, [selectedState, selectedResearch, dashboardAnalytics]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Data Analytics UF
        </h2>
        <p className="text-muted-foreground">
          Visualização geográfica de indicadores regionais por estado
        </p>
      </div>

      {/* Research Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecionar Pesquisa Regional</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando pesquisas...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Dropdown + Search */}
              <div className="space-y-3">
                {/* Dropdown */}
                <Select value={selectedResearch} onValueChange={setSelectedResearch}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma pesquisa regional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (desativar mapa)</SelectItem>
                    {filteredApis.map((api) => (
                      <SelectItem key={api.id} value={api.id}>
                        {api.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Search input below dropdown */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="buscar produto ou estado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-orange-500 focus:border-orange-500 focus-visible:ring-orange-500/20"
                  />
                </div>

                {/* No results message */}
                {filteredApis.length === 0 && searchTerm && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma pesquisa encontrada para "{searchTerm}"
                  </p>
                )}
              </div>

              {/* Right column: Regions and States */}
              {!isMapDisabled && allUfs && (
                <RegionalStatesHeader
                  availableStates={availableSiglas}
                  allUfs={allUfs}
                  hoveredState={hoveredState}
                  onHover={setHoveredState}
                  onSelect={setSelectedState}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map and State Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-4">
            <BrazilMap
              hoveredState={hoveredState}
              selectedState={selectedState}
              onHover={setHoveredState}
              onSelect={setSelectedState}
              disabled={isMapDisabled}
              availableStates={availableSiglas}
            />
          </CardContent>
        </Card>

        {/* State Data Panel */}
        <div className="lg:col-span-1">
          {selectedState && !isMapDisabled ? (
            <StateDataPanel
              ufSigla={selectedState}
              researchId={selectedResearch}
              onClose={() => setSelectedState(null)}
            />
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{isMapDisabled ? "Selecione uma pesquisa para ativar o mapa" : "Clique em um estado no mapa para ver os dados"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
