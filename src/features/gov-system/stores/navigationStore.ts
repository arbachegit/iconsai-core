import { create } from 'zustand';

interface Estado {
  id: string;
  sigla: string;
  nome: string;
  regiao?: string;
  indicadores: {
    populacao: number;
    pibTotal: number;
    idhm: number;
  };
}

interface BreadcrumbItem {
  nivel: string;
  id: string | number;
  nome: string;
  sigla?: string;
}

interface NavigationState {
  nivelAtual: 'brasil' | 'estado' | 'regiao' | 'cidade';
  breadcrumb: BreadcrumbItem[];
  estadoSelecionado: Estado | null;
  cidadeSelecionada: any | null;
  estadosParaComparar: string[];
  modoComparacao: boolean;
  
  selecionarEstado: (estado: Estado) => void;
  selecionarCidade: (cidade: any) => void;
  voltarNivel: () => void;
  resetar: () => void;
  toggleModoComparacao: () => void;
  toggleEstadoComparacao: (sigla: string) => void;
  limparComparacao: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  nivelAtual: 'brasil',
  breadcrumb: [{ nivel: 'brasil', id: 'BR', nome: 'Brasil' }],
  estadoSelecionado: null,
  cidadeSelecionada: null,
  estadosParaComparar: [],
  modoComparacao: false,
  
  selecionarEstado: (estado) => set((state) => ({
    nivelAtual: 'estado',
    estadoSelecionado: estado,
    breadcrumb: [
      state.breadcrumb[0],
      { nivel: 'estado', id: estado.id, nome: estado.nome, sigla: estado.sigla }
    ]
  })),
  
  selecionarCidade: (cidade) => set((state) => ({
    nivelAtual: 'cidade',
    cidadeSelecionada: cidade,
    breadcrumb: [
      ...state.breadcrumb.slice(0, 2),
      { nivel: 'cidade', id: cidade.id, nome: cidade.nome }
    ]
  })),
  
  voltarNivel: () => set((state) => {
    if (state.nivelAtual === 'cidade') {
      return {
        nivelAtual: 'estado',
        cidadeSelecionada: null,
        breadcrumb: state.breadcrumb.slice(0, 2)
      };
    }
    if (state.nivelAtual === 'estado') {
      return {
        nivelAtual: 'brasil',
        estadoSelecionado: null,
        breadcrumb: state.breadcrumb.slice(0, 1)
      };
    }
    return state;
  }),
  
  resetar: () => set({
    nivelAtual: 'brasil',
    breadcrumb: [{ nivel: 'brasil', id: 'BR', nome: 'Brasil' }],
    estadoSelecionado: null,
    cidadeSelecionada: null,
    estadosParaComparar: [],
    modoComparacao: false
  }),
  
  toggleModoComparacao: () => set((state) => ({
    modoComparacao: !state.modoComparacao,
    estadosParaComparar: state.modoComparacao ? [] : state.estadosParaComparar
  })),
  
  toggleEstadoComparacao: (sigla) => set((state) => {
    if (state.estadosParaComparar.includes(sigla)) {
      return { estadosParaComparar: state.estadosParaComparar.filter(s => s !== sigla) };
    }
    if (state.estadosParaComparar.length < 2) {
      return { estadosParaComparar: [...state.estadosParaComparar, sigla] };
    }
    return state;
  }),
  
  limparComparacao: () => set({
    estadosParaComparar: [],
    modoComparacao: false
  })
}));
