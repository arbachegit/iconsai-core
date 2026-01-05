import React, { useState } from 'react';
import { ArrowLeft, MapPin, BarChart3, Target, Scale, Building2, Stethoscope, Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigationStore } from '../stores/navigationStore';
import { BrazilMap } from '../components/maps/BrazilMap';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { MunicipalityList } from '../components/municipalities/MunicipalityList';
import { MunicipalDiagnosis } from '../components/diagnosis/MunicipalDiagnosis';
import { InvestmentSimulator } from '../components/simulator/InvestmentSimulator';
import { DADOS_ESTADOS } from '../data/estadosBrasil';
import type { Municipio } from '../types';

export const GovDashboard: React.FC = () => {
  const { 
    nivelAtual, 
    breadcrumb, 
    estadoSelecionado, 
    cidadeSelecionada, 
    voltarNivel, 
    resetar, 
    modoComparacao,
    toggleModoComparacao,
    estadosParaComparar, 
    limparComparacao,
    selecionarCidade
  } = useNavigationStore();
  
  const [showComparison, setShowComparison] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'simulador'>('diagnostico');

  const handleSelectMunicipio = (municipio: Municipio) => {
    selecionarCidade(municipio);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={resetar} 
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <MapPin className="w-7 h-7 text-primary" />
                <span className="text-2xl font-bold text-foreground">Gov System Fontes</span>
              </button>
              
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm">
                {breadcrumb.map((item, i) => (
                  <React.Fragment key={`${item.nivel}-${item.id}`}>
                    {i > 0 && <span className="text-muted-foreground">/</span>}
                    <span className={`${
                      i === breadcrumb.length - 1 
                        ? 'text-primary font-semibold' 
                        : 'text-muted-foreground'
                    }`}>
                      {item.sigla || item.nome}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              {nivelAtual !== 'brasil' && (
                <button
                  onClick={voltarNivel}
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Nível Brasil - Mapa */}
        {nivelAtual === 'brasil' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Mapa */}
            <div className="lg:col-span-3">
              <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
                <div className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    Mapa do Brasil
                  </h2>
                  <p className="text-primary-foreground/80 text-sm mt-1">
                    {modoComparacao 
                      ? `Selecione 2 estados para comparar (${estadosParaComparar.length}/2)`
                      : 'Clique em um estado para explorar'
                    }
                  </p>
                </div>
                <div className="h-[600px]">
                  <BrazilMap />
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-card rounded-xl shadow-lg p-5 border border-border">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-foreground">
                  <Scale className="w-5 h-5 text-purple-600" />
                  Comparar Estados
                </h3>
                <button
                  onClick={toggleModoComparacao}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    modoComparacao 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  {modoComparacao ? '✓ Modo Comparação Ativo' : 'Ativar Comparação'}
                </button>
                {estadosParaComparar.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {estadosParaComparar.map(sigla => (
                        <span key={sigla} className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-semibold">
                          {sigla} - {DADOS_ESTADOS[sigla]?.nome}
                        </span>
                      ))}
                    </div>
                    {estadosParaComparar.length === 2 && (
                      <button onClick={() => setShowComparison(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg">
                        Ver Comparação →
                      </button>
                    )}
                    <button onClick={limparComparacao} className="w-full py-2 text-destructive text-sm hover:bg-destructive/10 rounded-lg transition-colors">
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-card rounded-xl shadow-lg p-5 border border-border">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-foreground">
                  <Target className="w-5 h-5 text-orange-600" />
                  Diagnóstico Municipal
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Navegue até uma cidade para ver análise de gaps com Z-Score, comparação com municípios similares e simulação de custos.
                </p>
              </div>

              <div className="bg-card rounded-xl shadow-lg p-5 border border-border">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-foreground">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Estatísticas
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Estados</span><span className="font-bold text-foreground">27</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Municípios</span><span className="font-bold text-foreground">5.570</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">População</span><span className="font-bold text-foreground">203 mi</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nível Estado */}
        {nivelAtual === 'estado' && estadoSelecionado && (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">{estadoSelecionado.nome}</h2>
                  <p className="text-muted-foreground mt-1">{estadoSelecionado.regiao}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Código</div>
                  <div className="text-2xl font-bold text-primary">{estadoSelecionado.sigla}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{(estadoSelecionado.indicadores.populacao / 1000000).toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Milhões de habitantes</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{estadoSelecionado.indicadores.idhm.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground mt-1">IDHM</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{(estadoSelecionado.indicadores.pibTotal / 1000000000).toFixed(0)}</div>
                  <div className="text-sm text-muted-foreground mt-1">PIB (R$ bi)</div>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-xl p-6">
                <h3 className="font-bold mb-4 text-foreground">Municípios de {estadoSelecionado.nome}</h3>
                <MunicipalityList 
                  ufSigla={estadoSelecionado.sigla} 
                  onSelectMunicipio={handleSelectMunicipio}
                />
              </div>
            </div>
          </div>
        )}

        {/* Nível Cidade */}
        {nivelAtual === 'cidade' && cidadeSelecionada && (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">{cidadeSelecionada.nome}</h2>
                  <p className="text-muted-foreground">{cidadeSelecionada.ufSigla} • {cidadeSelecionada.populacao.toLocaleString('pt-BR')} habitantes</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-primary/10 text-primary rounded-full font-bold">
                    IDHM {cidadeSelecionada.idhm.toFixed(3)}
                  </span>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'diagnostico' | 'simulador')}>
                <TabsList className="mb-6">
                  <TabsTrigger value="diagnostico" className="gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Diagnóstico
                  </TabsTrigger>
                  <TabsTrigger value="simulador" className="gap-2">
                    <Calculator className="w-4 h-4" />
                    Simulador de Investimento
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="diagnostico">
                  <MunicipalDiagnosis 
                    municipio={cidadeSelecionada}
                    onOpenSimulator={() => setActiveTab('simulador')}
                  />
                </TabsContent>

                <TabsContent value="simulador">
                  <InvestmentSimulator 
                    municipio={cidadeSelecionada}
                    onClose={() => setActiveTab('diagnostico')}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {showComparison && estadosParaComparar.length === 2 && (
        <ComparisonTable estadoA={estadosParaComparar[0]} estadoB={estadosParaComparar[1]} onClose={() => setShowComparison(false)} />
      )}
    </div>
  );
};

export default GovDashboard;
