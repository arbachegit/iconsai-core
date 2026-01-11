import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Users, TrendingUp, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Municipio, FiltrosMunicipio } from '../../types';
import { getMunicipiosPorUF } from '../../data/municipiosBrasil';

interface MunicipalityListProps {
  ufSigla: string;
  onSelectMunicipio: (municipio: Municipio) => void;
}

export const MunicipalityList: React.FC<MunicipalityListProps> = ({
  ufSigla,
  onSelectMunicipio,
}) => {
  const [filtros, setFiltros] = useState<FiltrosMunicipio>({
    nome: '',
    populacaoMin: null,
    populacaoMax: null,
    idhmMin: null,
    idhmMax: null,
    ordenarPor: 'populacao',
    ordemAsc: false,
  });

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const municipios = useMemo(() => {
    let lista = getMunicipiosPorUF(ufSigla);

    // Filter by name
    if (filtros.nome) {
      const termo = filtros.nome.toLowerCase();
      lista = lista.filter(m => m.nome.toLowerCase().includes(termo));
    }

    // Filter by population
    if (filtros.populacaoMin !== null) {
      lista = lista.filter(m => m.populacao >= filtros.populacaoMin!);
    }
    if (filtros.populacaoMax !== null) {
      lista = lista.filter(m => m.populacao <= filtros.populacaoMax!);
    }

    // Filter by IDHM
    if (filtros.idhmMin !== null) {
      lista = lista.filter(m => m.idhm >= filtros.idhmMin!);
    }
    if (filtros.idhmMax !== null) {
      lista = lista.filter(m => m.idhm <= filtros.idhmMax!);
    }

    // Sort
    lista.sort((a, b) => {
      let valorA: number, valorB: number;
      
      switch (filtros.ordenarPor) {
        case 'nome':
          return filtros.ordemAsc 
            ? a.nome.localeCompare(b.nome) 
            : b.nome.localeCompare(a.nome);
        case 'populacao':
          valorA = a.populacao;
          valorB = b.populacao;
          break;
        case 'idhm':
          valorA = a.idhm;
          valorB = b.idhm;
          break;
        case 'pibPerCapita':
          valorA = a.pibPerCapita;
          valorB = b.pibPerCapita;
          break;
        default:
          valorA = a.populacao;
          valorB = b.populacao;
      }

      return filtros.ordemAsc ? valorA - valorB : valorB - valorA;
    });

    return lista;
  }, [ufSigla, filtros]);

  const totalPaginas = Math.ceil(municipios.length / itensPorPagina);
  const municipiosPaginados = municipios.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const toggleOrdenacao = (campo: FiltrosMunicipio['ordenarPor']) => {
    if (filtros.ordenarPor === campo) {
      setFiltros(prev => ({ ...prev, ordemAsc: !prev.ordemAsc }));
    } else {
      setFiltros(prev => ({ ...prev, ordenarPor: campo, ordemAsc: false }));
    }
  };

  const getIdhmColor = (idhm: number) => {
    if (idhm >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (idhm >= 0.7) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (idhm >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar município..."
            value={filtros.nome}
            onChange={(e) => {
              setFiltros(prev => ({ ...prev, nome: e.target.value }));
              setPaginaAtual(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filtros.ordenarPor === 'populacao' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleOrdenacao('populacao')}
            className="gap-1"
          >
            <Users className="w-4 h-4" />
            População
            {filtros.ordenarPor === 'populacao' && (
              <ArrowUpDown className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant={filtros.ordenarPor === 'idhm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleOrdenacao('idhm')}
            className="gap-1"
          >
            <TrendingUp className="w-4 h-4" />
            IDHM
            {filtros.ordenarPor === 'idhm' && (
              <ArrowUpDown className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {municipios.length} município{municipios.length !== 1 ? 's' : ''} encontrado{municipios.length !== 1 ? 's' : ''}
      </div>

      {/* Municipality List */}
      <div className="space-y-2">
        {municipiosPaginados.map((municipio) => (
          <button
            key={municipio.codigoIbge}
            onClick={() => onSelectMunicipio(municipio)}
            className="w-full p-4 bg-muted/50 hover:bg-muted rounded-xl transition-all text-left group border border-transparent hover:border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {municipio.nome}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {municipio.populacao.toLocaleString('pt-BR')} habitantes
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">PIB/cap</div>
                  <div className="font-medium text-foreground">
                    R$ {municipio.pibPerCapita.toLocaleString('pt-BR')}
                  </div>
                </div>
                <Badge className={getIdhmColor(municipio.idhm)}>
                  {municipio.idhm.toFixed(3)}
                </Badge>
              </div>
            </div>
          </button>
        ))}

        {municipiosPaginados.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum município encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
            disabled={paginaAtual === 1}
          >
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              let pageNum: number;
              if (totalPaginas <= 5) {
                pageNum = i + 1;
              } else if (paginaAtual <= 3) {
                pageNum = i + 1;
              } else if (paginaAtual >= totalPaginas - 2) {
                pageNum = totalPaginas - 4 + i;
              } else {
                pageNum = paginaAtual - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={paginaAtual === pageNum ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPaginaAtual(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
            disabled={paginaAtual === totalPaginas}
          >
            Próximo
          </Button>
        </div>
      )}
    </div>
  );
};
