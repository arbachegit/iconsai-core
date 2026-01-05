import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, MapPinned, Building2, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrazilMap } from '../../gov-system/components/maps/BrazilMap';
import { MunicipalityList } from '../../gov-system/components/municipalities/MunicipalityList';
import { DADOS_ESTADOS } from '../../gov-system/data/estadosBrasil';
import { getMunicipiosPorUF } from '../../gov-system/data/municipiosBrasil';
import { CityModelSelector } from '../components/CityModelSelector';
import { InvestmentPlanView } from '../components/InvestmentPlanView';
import type { Municipio } from '../../gov-system/types';
import type { MunicipioComparacao, CidadeModelo, PlanoInvestimento } from '../types';
import { gerarPlanoInvestimento } from '../services/comparacaoCidades';
import { useNavigationStore } from '../../gov-system/stores/navigationStore';

export const GovCityDashboard: React.FC = () => {
  const { 
    nivelAtual, 
    breadcrumb, 
    estadoSelecionado, 
    cidadeSelecionada, 
    voltarNivel, 
    resetar,
    selecionarCidade
  } = useNavigationStore();

  const [cidadeModelo, setCidadeModelo] = useState<CidadeModelo | null>(null);
  const [planoInvestimento, setPlanoInvestimento] = useState<PlanoInvestimento | null>(null);
  const [activeTab, setActiveTab] = useState<'modelo' | 'plano'>('modelo');

  // Get all municipalities for comparison
  const todasCidades = useMemo((): MunicipioComparacao[] => {
    const allMunicipios: MunicipioComparacao[] = [];
    
    Object.entries(DADOS_ESTADOS).forEach(([sigla, estado]) => {
      const municipios = getMunicipiosPorUF(sigla);
      municipios.forEach(m => {
        allMunicipios.push({
          id: m.id,
          codigoIbge: m.codigoIbge,
          nome: m.nome,
          ufSigla: m.ufSigla,
          populacao: m.populacao,
          idhm: m.idhm,
          pibPerCapita: m.pibPerCapita,
          rendaMedia: m.rendaMedia,
          esperancaVida: m.esperancaVida,
          mortInfantil: m.mortInfantil,
          leitosPor1000: m.leitosPor1000,
          medicosPor1000: m.medicosPor1000,
          ideb: m.ideb,
          txAlfabetizacao: m.txAlfabetizacao,
          aguaEncanada: m.aguaEncanada,
          esgotoAdequado: m.esgotoAdequado,
          coletaLixo: m.coletaLixo,
        });
      });
    });
    
    return allMunicipios;
  }, []);

  // Convert selected city to comparison format
  const cidadeOrigemComparacao = useMemo((): MunicipioComparacao | null => {
    if (!cidadeSelecionada) return null;
    return {
      id: cidadeSelecionada.id,
      codigoIbge: cidadeSelecionada.codigoIbge,
      nome: cidadeSelecionada.nome,
      ufSigla: cidadeSelecionada.ufSigla,
      populacao: cidadeSelecionada.populacao,
      idhm: cidadeSelecionada.idhm,
      pibPerCapita: cidadeSelecionada.pibPerCapita,
      rendaMedia: cidadeSelecionada.rendaMedia,
      esperancaVida: cidadeSelecionada.esperancaVida,
      mortInfantil: cidadeSelecionada.mortInfantil,
      leitosPor1000: cidadeSelecionada.leitosPor1000,
      medicosPor1000: cidadeSelecionada.medicosPor1000,
      ideb: cidadeSelecionada.ideb,
      txAlfabetizacao: cidadeSelecionada.txAlfabetizacao,
      aguaEncanada: cidadeSelecionada.aguaEncanada,
      esgotoAdequado: cidadeSelecionada.esgotoAdequado,
      coletaLixo: cidadeSelecionada.coletaLixo,
    };
  }, [cidadeSelecionada]);

  // Handle model city selection
  const handleSelectModel = (modelo: CidadeModelo) => {
    setCidadeModelo(modelo);
    if (cidadeOrigemComparacao) {
      const plano = gerarPlanoInvestimento(cidadeOrigemComparacao, modelo);
      setPlanoInvestimento(plano);
      setActiveTab('plano');
    }
  };

  const handleSelectMunicipio = (municipio: Municipio) => {
    selecionarCidade(municipio);
    setCidadeModelo(null);
    setPlanoInvestimento(null);
    setActiveTab('modelo');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPinned className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                  Gov City AI
                </h1>
              </div>
              
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumb.map((item, i) => (
                  <React.Fragment key={item.id}>
                    {i > 0 && <span>/</span>}
                    <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>
                      {item.sigla || item.nome}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            <div>
              {nivelAtual !== 'brasil' && (
                <Button variant="outline" size="sm" onClick={voltarNivel} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Nível Brasil - Mapa */}
        {nivelAtual === 'brasil' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold">Mapa do Brasil - Gov City AI</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique em um estado para explorar as cidades
                  </p>
                </div>
                <div className="p-4">
                  <BrazilMap />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Como Funciona</h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Selecione um estado no mapa</p>
                  <p>2. Escolha uma cidade para analisar</p>
                  <p>3. Selecione uma cidade modelo (com IDHM maior)</p>
                  <p>4. O sistema calcula os investimentos automaticamente</p>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Cidades Disponíveis</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total de Cidades</p>
                    <p className="text-2xl font-bold text-primary">{todasCidades.length}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Estados</p>
                    <p className="text-2xl font-bold text-primary">27</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nível Estado */}
        {nivelAtual === 'estado' && estadoSelecionado && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{estadoSelecionado.nome}</h2>
                  <p className="text-muted-foreground">{estadoSelecionado.regiao}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="text-lg font-semibold">{estadoSelecionado.sigla}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold mb-4">Selecione uma Cidade para Comparar</h3>
              <MunicipalityList
                ufSigla={estadoSelecionado.sigla}
                onSelectMunicipio={handleSelectMunicipio}
              />
            </div>
          </div>
        )}

        {/* Nível Cidade - City Comparison */}
        {nivelAtual === 'cidade' && cidadeSelecionada && cidadeOrigemComparacao && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{cidadeSelecionada.nome}</h2>
                  <p className="text-muted-foreground">
                    {cidadeSelecionada.ufSigla} • {cidadeSelecionada.populacao.toLocaleString('pt-BR')} habitantes
                  </p>
                </div>
                <div>
                  <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                    IDHM {cidadeSelecionada.idhm.toFixed(3)}
                  </Badge>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'modelo' | 'plano')}>
              <TabsList className="mb-4">
                <TabsTrigger value="modelo" className="gap-2">
                  <Target className="w-4 h-4" />
                  Escolher Cidade Modelo
                </TabsTrigger>
                <TabsTrigger value="plano" className="gap-2" disabled={!planoInvestimento}>
                  <BarChart3 className="w-4 h-4" />
                  Plano de Investimento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modelo">
                <CityModelSelector
                  cidadeOrigem={cidadeOrigemComparacao}
                  todasCidades={todasCidades}
                  onSelectModel={handleSelectModel}
                  cidadeSelecionada={cidadeModelo}
                />
              </TabsContent>

              <TabsContent value="plano">
                {planoInvestimento && (
                  <InvestmentPlanView plano={planoInvestimento} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default GovCityDashboard;
