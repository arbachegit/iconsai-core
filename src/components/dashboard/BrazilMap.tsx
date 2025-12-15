import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface BrazilMapProps {
  hoveredState: string | null;
  selectedState: string | null;
  onHover: (state: string | null) => void;
  onSelect: (state: string) => void;
}

interface GeoFeature {
  type: string;
  properties: {
    sigla: string;
    name: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][][];
  };
}

interface GeoJSON {
  type: string;
  features: GeoFeature[];
}

// Multiple fallback URLs for GeoJSON
const GEOJSON_URLS = [
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson",
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF"
];

// Convert GeoJSON coordinates to SVG path
function coordinatesToPath(coordinates: number[][][][], scale: number, offsetX: number, offsetY: number): string {
  let path = "";
  
  coordinates.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach((point, i) => {
        const x = (point[0] + 75) * scale + offsetX;
        const y = (-point[1] + 5) * scale + offsetY;
        path += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
      });
      path += "Z ";
    });
  });
  
  return path;
}

// Try fetching from multiple URLs with timeout
async function fetchWithFallback(urls: string[], timeout = 5000): Promise<GeoJSON | null> {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Handle IBGE format (nested structure)
        if (data.objects?.BR_UF_2022?.geometries) {
          // IBGE TopoJSON needs conversion - skip for now
          continue;
        }
        return data;
      }
    } catch (err) {
      console.warn(`Failed to fetch from ${url}:`, err);
    }
  }
  return null;
}

export function BrazilMap({ hoveredState, selectedState, onHover, onSelect }: BrazilMapProps) {
  const [geoData, setGeoData] = useState<GeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchWithFallback(GEOJSON_URLS)
      .then((data) => {
        if (data) {
          setGeoData(data);
        } else {
          setError("Não foi possível carregar os dados do mapa. Verifique sua conexão.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading Brazil GeoJSON:", err);
        setError("Erro ao processar dados do mapa.");
        setLoading(false);
      });
  }, []);

  const paths = useMemo(() => {
    if (!geoData) return [];
    
    const scale = 12;
    const offsetX = 50;
    const offsetY = 100;
    
    return geoData.features.map((feature) => ({
      sigla: feature.properties.sigla,
      name: feature.properties.name,
      path: coordinatesToPath(
        feature.geometry.type === "MultiPolygon" 
          ? feature.geometry.coordinates 
          : [feature.geometry.coordinates] as unknown as number[][][][],
        scale,
        offsetX,
        offsetY
      ),
    }));
  }, [geoData]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 30,
    });
  };

  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!geoData || error) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <span>Erro ao carregar mapa</span>
        {error && <span className="text-xs text-destructive">{error}</span>}
        <button 
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchWithFallback(GEOJSON_URLS).then((data) => {
              if (data) setGeoData(data);
              else setError("Falha ao reconectar.");
              setLoading(false);
            });
          }}
          className="text-sm text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="relative" onMouseMove={handleMouseMove}>
      <svg
        viewBox="0 0 600 600"
        className="w-full h-auto max-h-[600px]"
        style={{ background: "transparent" }}
      >
        {paths.map((state) => {
          const isHovered = hoveredState === state.sigla;
          const isSelected = selectedState === state.sigla;
          
          return (
            <path
              key={state.sigla}
              d={state.path}
              className={cn(
                "transition-all duration-300 cursor-pointer",
                isHovered || isSelected
                  ? "drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]"
                  : ""
              )}
              style={{
                fill: isHovered || isSelected ? "rgba(255, 0, 255, 0.3)" : "transparent",
                stroke: isHovered || isSelected ? "#FF00FF" : "#00FFFF",
                strokeWidth: isHovered || isSelected ? 2 : 1.5,
              }}
              onMouseEnter={() => onHover(state.sigla)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(state.sigla)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && (
        <div
          className="absolute bg-white backdrop-blur-sm border border-gray-300 text-black px-3 py-1.5 rounded-md text-sm font-bold pointer-events-none z-10 shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          {paths.find((p) => p.sigla === hoveredState)?.name || hoveredState}
        </div>
      )}
    </div>
  );
}
