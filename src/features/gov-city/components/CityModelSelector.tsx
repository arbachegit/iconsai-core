import React, { useState, useMemo } from 'react';
import { Search, Target, Users, TrendingUp, Check, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { MunicipioComparacao, CidadeModelo, FiltrosCidadeModelo } from '../types';
import { buscarCidadesModelo } from '../services/comparacaoCidades';

interface CityModelSelectorProps {
  cidadeOrigem: MunicipioComparacao;
  todasCidades: MunicipioComparacao[];
  onSelectModel: (modelo: CidadeModelo) => void;
  cidadeSelecionada?: CidadeModelo | null;
}

export const CityModelSelector: React.FC<CityModelSelectorProps> = ({
  cidadeOrigem,
  todasCidades,
  onSelectModel,
  cidadeSelecionada,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosCidadeModelo>({
    populacaoMinima: 50,
    populacaoMaxima: 200,
    idhmMinimo: cidadeOrigem.idhm + 0.01,
    apenasCapitais: false,
    mesmaRegiao: false,
  });

  const cidadesModelo = useMemo(() => {
    let cidades = buscarCidadesModelo(cidadeOrigem, todasCidades, filtros);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cidades = cidades.filter(c => 
        c.cidade.nome.toLowerCase().includes(query) ||
        c.cidade.ufSigla.toLowerCase().includes(query)
      );
    }
    
    return cidades;
  }, [cidadeOrigem, todasCidades, filtros, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Escolha uma Cidade Modelo</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione uma cidade com indicadores melhores para o sistema calcular os investimentos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-muted/50 rounded-xl space-y-4 border border-border">
          <div>
            <Label className="text-sm">
              Faixa de População: {filtros.populacaoMinima}% - {filtros.populacaoMaxima}%
            </Label>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-muted-foreground">Min</span>
              <Slider
                value={[filtros.populacaoMinima]}
                min={10}
                max={100}
                step={10}
                onValueChange={(v) => setFiltros({...filtros, populacaoMinima: v[0]})}
                className="flex-1"
              />
              <Slider
                value={[filtros.populacaoMaxima]}
                min={100}
                max={500}
                step={25}
                onValueChange={(v) => setFiltros({...filtros, populacaoMaxima: v[0]})}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">Max</span>
            </div>
          </div>
          
          <div>
            <Label className="text-sm">IDHM Mínimo: {filtros.idhmMinimo.toFixed(3)}</Label>
            <Slider
              value={[filtros.idhmMinimo * 1000]}
              min={Math.round(cidadeOrigem.idhm * 1000)}
              max={900}
              step={5}
              onValueChange={(v) => setFiltros({...filtros, idhmMinimo: v[0] / 1000})}
              className="mt-2"
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cidade modelo..."
          className="pl-10"
        />
      </div>

      {/* City List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {cidadesModelo.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma cidade modelo encontrada com os filtros atuais.</p>
            <p className="text-sm mt-1">Tente ajustar os filtros de população ou IDHM.</p>
          </div>
        ) : (
          cidadesModelo.map((modelo) => {
            const isSelected = cidadeSelecionada?.cidade.codigoIbge === modelo.cidade.codigoIbge;
            
            return (
              <button
                key={modelo.cidade.codigoIbge}
                onClick={() => onSelectModel(modelo)}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-md'
                    : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{modelo.cidade.nome}</span>
                      <Badge variant="outline" className="text-xs">{modelo.cidade.ufSigla}</Badge>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {modelo.cidade.populacao.toLocaleString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        IDHM {modelo.cidade.idhm.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={modelo.diferencaIdhm > 0.05 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      +{(modelo.diferencaIdhm * 100).toFixed(1)}%
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {modelo.similaridadePopulacao.toFixed(0)}% similar
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        {cidadesModelo.length} cidades modelo disponíveis
      </div>
    </div>
  );
};
