import React from 'react';
import { ArrowUp, Minus, X } from 'lucide-react';
import { DADOS_ESTADOS, CORES_ESTADOS } from '../../data/estadosBrasil';

interface ComparisonTableProps {
  estadoA: string;
  estadoB: string;
  onClose: () => void;
}

const INDICADORES = [
  { key: 'populacao', label: 'População', unidade: 'hab', maiorMelhor: true },
  { key: 'pib', label: 'PIB', unidade: 'R$ mi', maiorMelhor: true },
  { key: 'idhm', label: 'IDHM', unidade: '', maiorMelhor: true },
];

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ estadoA, estadoB, onClose }) => {
  const dadosA = DADOS_ESTADOS[estadoA];
  const dadosB = DADOS_ESTADOS[estadoB];

  if (!dadosA || !dadosB) return null;

  const calcularDelta = (valorA: number, valorB: number, maiorMelhor: boolean) => {
    const delta = valorA - valorB;
    const deltaPct = valorB !== 0 ? (delta / valorB) * 100 : 0;
    let vencedor: 'A' | 'B' | 'empate' = 'empate';
    
    if (delta !== 0) {
      if (maiorMelhor) {
        vencedor = delta > 0 ? 'A' : 'B';
      } else {
        vencedor = delta < 0 ? 'A' : 'B';
      }
    }
    
    return { delta, deltaPct, vencedor };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Comparação de Estados</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Header com estados */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-xl">
              <div 
                className="w-6 h-6 rounded-full mx-auto mb-2"
                style={{ backgroundColor: CORES_ESTADOS[estadoA] }}
              />
              <div className="font-bold text-lg text-foreground">{estadoA}</div>
              <div className="text-sm text-muted-foreground">{dadosA.nome}</div>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
            </div>
            <div className="text-center p-4 bg-muted rounded-xl">
              <div 
                className="w-6 h-6 rounded-full mx-auto mb-2"
                style={{ backgroundColor: CORES_ESTADOS[estadoB] }}
              />
              <div className="font-bold text-lg text-foreground">{estadoB}</div>
              <div className="text-sm text-muted-foreground">{dadosB.nome}</div>
            </div>
          </div>

          {/* Tabela de indicadores */}
          <div className="space-y-3">
            {INDICADORES.map(({ key, label, unidade, maiorMelhor }) => {
              const valorA = dadosA[key as keyof typeof dadosA] as number;
              const valorB = dadosB[key as keyof typeof dadosB] as number;
              const { deltaPct, vencedor } = calcularDelta(valorA, valorB, maiorMelhor);

              return (
                <div 
                  key={key}
                  className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-xl items-center"
                >
                  <div className={`text-right font-semibold ${vencedor === 'A' ? 'text-green-600' : 'text-foreground'}`}>
                    {typeof valorA === 'number' && valorA < 1 
                      ? valorA.toFixed(3) 
                      : valorA.toLocaleString('pt-BR')
                    }
                    {unidade && <span className="text-xs text-muted-foreground ml-1">{unidade}</span>}
                    {vencedor === 'A' && <ArrowUp className="inline w-4 h-4 ml-1 text-green-600" />}
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-foreground">{label}</div>
                    <div className={`text-xs ${
                      vencedor === 'empate' ? 'text-muted-foreground' : 
                      vencedor === 'A' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {vencedor === 'empate' ? (
                        <><Minus className="inline w-3 h-3" /> Empate</>
                      ) : (
                        `${Math.abs(deltaPct).toFixed(1)}% ${vencedor === 'A' ? '←' : '→'}`
                      )}
                    </div>
                  </div>
                  
                  <div className={`text-left font-semibold ${vencedor === 'B' ? 'text-blue-600' : 'text-foreground'}`}>
                    {vencedor === 'B' && <ArrowUp className="inline w-4 h-4 mr-1 text-blue-600" />}
                    {typeof valorB === 'number' && valorB < 1 
                      ? valorB.toFixed(3) 
                      : valorB.toLocaleString('pt-BR')
                    }
                    {unidade && <span className="text-xs text-muted-foreground ml-1">{unidade}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
