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

const GEOJSON_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

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

export function BrazilMap({ hoveredState, selectedState, onHover, onSelect }: BrazilMapProps) {
  const [geoData, setGeoData] = useState<GeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading Brazil GeoJSON:", err);
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

  if (!geoData) {
    return (
      <div className="h-[500px] flex items-center justify-center text-muted-foreground">
        Erro ao carregar mapa
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
          className="absolute bg-background/95 backdrop-blur-sm border border-border text-foreground px-3 py-1.5 rounded-md text-sm font-medium pointer-events-none z-10 shadow-lg"
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
