import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import { BrazilMap } from "./BrazilMap";
import { StateDataPanel } from "./StateDataPanel";

export function DataAnalyticsUF() {
  const [selectedResearch, setSelectedResearch] = useState<string>("");
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

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
            <Select value={selectedResearch} onValueChange={setSelectedResearch}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione uma pesquisa regional" />
              </SelectTrigger>
              <SelectContent>
                {regionalApis?.map((api) => (
                  <SelectItem key={api.id} value={api.id}>
                    {api.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            />
          </CardContent>
        </Card>

        {/* State Data Panel */}
        <div className="lg:col-span-1">
          {selectedState ? (
            <StateDataPanel
              ufSigla={selectedState}
              researchId={selectedResearch || null}
              onClose={() => setSelectedState(null)}
            />
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Clique em um estado no mapa para ver os dados</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
