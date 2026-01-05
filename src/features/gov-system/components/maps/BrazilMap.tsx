import React, { useState, useCallback, memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useNavigationStore } from '../../stores/navigationStore';
import { CORES_ESTADOS, DADOS_ESTADOS } from '../../data/estadosBrasil';

const GEO_URL = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';

interface TooltipData {
  sigla: string;
  x: number;
  y: number;
}

const BrazilMapComponent: React.FC = () => {
  const { 
    selecionarEstado, 
    toggleEstadoComparacao, 
    estadosParaComparar, 
    modoComparacao 
  } = useNavigationStore();
  
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const handleStateClick = useCallback((sigla: string) => {
    if (!sigla || !DADOS_ESTADOS[sigla]) return;
    
    if (modoComparacao) {
      toggleEstadoComparacao(sigla);
      return;
    }
    
    const dados = DADOS_ESTADOS[sigla];
    selecionarEstado({
      id: sigla,
      sigla,
      nome: dados.nome,
      regiao: dados.regiao,
      indicadores: {
        populacao: dados.populacao,
        pibTotal: dados.pib * 1000000,
        idhm: dados.idhm
      }
    });
  }, [modoComparacao, selecionarEstado, toggleEstadoComparacao]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, sigla: string) => {
    if (sigla && DADOS_ESTADOS[sigla]) {
      setTooltip({ sigla, x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const getStateStyle = useCallback((sigla: string) => {
    const isSelected = estadosParaComparar.includes(sigla);
    const baseColor = CORES_ESTADOS[sigla] || '#E0E0E0';
    
    return {
      default: {
        fill: isSelected ? '#2196F3' : baseColor,
        stroke: '#FFFFFF',
        strokeWidth: 0.5,
        outline: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out'
      },
      hover: {
        fill: isSelected ? '#1976D2' : '#FFD700',
        stroke: '#FFFFFF',
        strokeWidth: 1.5,
        outline: 'none',
        cursor: 'pointer'
      },
      pressed: {
        fill: '#FF5722',
        stroke: '#FFFFFF',
        strokeWidth: 1,
        outline: 'none'
      }
    };
  }, [estadosParaComparar]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 850,
          center: [-54, -15]
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const sigla = geo.properties.sigla || geo.properties.UF || geo.properties.SIGLA || '';
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleStateClick(sigla)}
                    onMouseEnter={(e) => handleMouseEnter(e as unknown as React.MouseEvent, sigla)}
                    onMouseLeave={handleMouseLeave}
                    style={getStateStyle(sigla)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && DADOS_ESTADOS[tooltip.sigla] && (
        <div
          className="fixed z-50 bg-card rounded-xl shadow-2xl p-4 pointer-events-none border border-border min-w-[220px]"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
            <div 
              className="w-4 h-4 rounded-full shadow-inner" 
              style={{ backgroundColor: CORES_ESTADOS[tooltip.sigla] }} 
            />
            <div>
              <div className="font-bold text-foreground">
                {DADOS_ESTADOS[tooltip.sigla].nome}
              </div>
              <div className="text-xs text-muted-foreground">
                {DADOS_ESTADOS[tooltip.sigla].regiao}
              </div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">População:</span>
              <span className="font-semibold text-foreground">
                {DADOS_ESTADOS[tooltip.sigla].populacao.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">PIB:</span>
              <span className="font-semibold text-foreground">
                R$ {DADOS_ESTADOS[tooltip.sigla].pib.toLocaleString('pt-BR')} mi
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">IDHM:</span>
              <span className={`font-bold ${
                DADOS_ESTADOS[tooltip.sigla].idhm >= 0.7 
                  ? 'text-green-600' 
                  : DADOS_ESTADOS[tooltip.sigla].idhm >= 0.6 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                {DADOS_ESTADOS[tooltip.sigla].idhm.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Capital:</span>
              <span className="font-medium text-foreground">
                {DADOS_ESTADOS[tooltip.sigla].capital}
              </span>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t border-border text-center">
            <span className="text-xs text-primary font-medium">
              Clique para explorar →
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const BrazilMap = memo(BrazilMapComponent);
