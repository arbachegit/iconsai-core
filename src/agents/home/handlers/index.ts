/**
 * Home Agent Handlers
 * @version 2.0.0
 * @date 2026-01-26
 *
 * Implementation of tools defined in mcp-config.ts
 * Uses MCP multi-database pattern for data access:
 * - brasil-data-hub: Geographic/demographic data (pop_municipios)
 * - fiscal-municipal: Fiscal system data (iconsai-core)
 */

import type { ToolHandler, ExecutionContext } from '@/lib/mcp/types';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchPopMunicipio,
  fetchPopulacaoHistorico,
  getBrasilDataHubClient,
  type PopMunicipioData,
} from '@/lib/mcp/database-client';

// ============================================
// SQL HANDLERS (Dados Estruturados via MCP)
// ============================================

/**
 * Busca município por nome ou código IBGE
 * Fonte: brasil-data-hub.pop_municipios (via MCP)
 */
export const buscarMunicipio: ToolHandler<
  { termo: string; uf?: string },
  unknown
> = async (input, context) => {
  const { termo, uf } = input;

  // Try brasil-data-hub first (more complete data)
  const brasilDataResult = await fetchPopMunicipio(termo, uf);

  if (brasilDataResult && brasilDataResult.length > 0) {
    console.log('[buscarMunicipio] Found in brasil-data-hub:', brasilDataResult.length);
    return brasilDataResult;
  }

  // Fallback to local municipios table
  console.log('[buscarMunicipio] Fallback to local municipios table');

  // Se é código IBGE (7 dígitos)
  if (/^\d{7}$/.test(termo)) {
    const { data, error } = await supabase
      .from('municipios')
      .select('*')
      .eq('codigo_ibge', parseInt(termo))
      .single();

    if (error) {
      console.error('[buscarMunicipio] Error:', error);
      return null;
    }
    return data ? [data] : null;
  }

  // Busca por nome
  let query = supabase
    .from('municipios')
    .select('*')
    .ilike('nome', `%${termo}%`);

  if (uf) {
    query = query.eq('uf', uf.toUpperCase());
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error('[buscarMunicipio] Error:', error);
    return null;
  }

  return data;
};

/**
 * Busca dados populacionais completos
 * Fonte: brasil-data-hub.pop_municipios (via MCP)
 * Inclui: população estimada, censo, área, densidade, PIB, IDH
 */
export const buscarPopulacao: ToolHandler<
  { codigo_ibge?: string; municipio?: string; incluir_historico?: boolean },
  unknown
> = async (input, context) => {
  const { codigo_ibge, municipio, incluir_historico = false } = input;

  const termo = codigo_ibge || municipio;
  if (!termo) {
    return { error: 'Informe código IBGE ou nome do município' };
  }

  // Fetch from brasil-data-hub
  const brasilDataResult = await fetchPopMunicipio(termo);

  if (brasilDataResult && brasilDataResult.length > 0) {
    const mun = brasilDataResult[0];

    // Format rich response
    const response: Record<string, unknown> = {
      municipio: {
        codigo_ibge: mun.codigo_ibge,
        nome: mun.nome,
        uf: mun.uf,
        regiao: mun.regiao,
      },
      populacao: {
        estimada: mun.populacao_estimada,
        censo: mun.populacao_censo,
        ano: mun.ano_populacao,
        densidade_km2: mun.densidade_demografica,
      },
      territorio: {
        area_km2: mun.area_km2,
        latitude: mun.latitude,
        longitude: mun.longitude,
        capital: mun.capital,
        mesorregiao: mun.mesorregiao,
        microrregiao: mun.microrregiao,
      },
      economia: {
        pib: mun.pib,
        pib_per_capita: mun.pib_per_capita,
        idh: mun.idh,
      },
      fonte: 'brasil-data-hub',
    };

    // Include historical data if requested
    if (incluir_historico && mun.codigo_ibge) {
      const historico = await fetchPopulacaoHistorico(mun.codigo_ibge);
      if (historico) {
        response.historico_populacao = historico;
      }
    }

    return response;
  }

  // Fallback to local table
  let query = supabase
    .from('municipios')
    .select('codigo_ibge, nome, uf, populacao_2022, regiao, lat, lng, pib_2021_milhoes');

  if (codigo_ibge) {
    query = query.eq('codigo_ibge', parseInt(codigo_ibge));
  } else if (municipio) {
    query = query.ilike('nome', `%${municipio}%`);
  }

  const { data, error } = await query.limit(5);

  if (error) {
    console.error('[buscarPopulacao] Error:', error);
    return null;
  }

  // Format fallback response
  if (data && data.length > 0) {
    const mun = data[0];
    return {
      municipio: {
        codigo_ibge: mun.codigo_ibge,
        nome: mun.nome,
        uf: mun.uf,
        regiao: mun.regiao,
      },
      populacao: {
        estimada: mun.populacao_2022,
        ano: 2022,
      },
      territorio: {
        latitude: mun.lat,
        longitude: mun.lng,
      },
      economia: {
        pib_milhoes: mun.pib_2021_milhoes,
      },
      fonte: 'local',
    };
  }

  return null;
};

/**
 * Busca estabelecimentos de saúde
 */
export const buscarEstabelecimentoSaude: ToolHandler<
  { municipio: string; tipo?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { municipio, tipo = 'TODOS', limite = 10 } = input;

  // Primeiro, encontrar o município
  const { data: mun } = await supabase
    .from('municipios')
    .select('codigo_ibge, nome')
    .ilike('nome', `%${municipio}%`)
    .limit(1)
    .single();

  if (!mun) {
    return { error: 'Município não encontrado', municipio };
  }

  // Buscar estabelecimentos
  let query = supabase
    .from('estabelecimentos_saude')
    .select('cnes, nome_fantasia, tipo_estabelecimento, endereco, bairro, telefone, atendimento_urgencia')
    .eq('codigo_ibge', mun.codigo_ibge);

  if (tipo !== 'TODOS') {
    query = query.eq('tipo_estabelecimento', tipo);
  }

  const { data, error } = await query.limit(limite);

  if (error) {
    // Table might not exist yet or no data
    console.warn('[buscarEstabelecimentoSaude] Query error:', error.message);
    return {
      municipio: mun.nome,
      message: 'Dados de estabelecimentos de saúde ainda não disponíveis para este município',
      total: 0,
      estabelecimentos: [],
    };
  }

  return {
    municipio: mun.nome,
    total: data?.length || 0,
    estabelecimentos: data,
  };
};

/**
 * Busca escolas
 */
export const buscarEscola: ToolHandler<
  { municipio: string; tipo?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { municipio, tipo = 'TODOS', limite = 10 } = input;

  // Primeiro, encontrar o município
  const { data: mun } = await supabase
    .from('municipios')
    .select('codigo_ibge, nome')
    .ilike('nome', `%${municipio}%`)
    .limit(1)
    .single();

  if (!mun) {
    return { error: 'Município não encontrado', municipio };
  }

  // Buscar escolas
  let query = supabase
    .from('escolas')
    .select('codigo_inep, nome, dependencia_administrativa, endereco, bairro, telefone, etapas_ensino')
    .eq('codigo_ibge', mun.codigo_ibge);

  if (tipo !== 'TODOS') {
    query = query.contains('etapas_ensino', [tipo]);
  }

  const { data, error } = await query.limit(limite);

  if (error) {
    // Table might not exist yet or no data
    console.warn('[buscarEscola] Query error:', error.message);
    return {
      municipio: mun.nome,
      message: 'Dados de escolas ainda não disponíveis para este município',
      total: 0,
      escolas: [],
    };
  }

  return {
    municipio: mun.nome,
    total: data?.length || 0,
    escolas: data,
  };
};

// ============================================
// RAG HANDLERS (Busca Semântica)
// ============================================

/**
 * Busca protocolos clínicos (placeholder - será implementado com RAG)
 */
export const buscarProtocolo: ToolHandler<
  { query: string; categoria?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { query, categoria = 'todos', limite = 5 } = input;

  // TODO: Implementar busca vetorial quando RAG estiver pronto
  // Por enquanto, retorna placeholder

  console.log('[buscarProtocolo] RAG não implementado ainda. Query:', query);

  return {
    message: 'Busca em protocolos será implementada em breve',
    query,
    categoria,
  };
};

/**
 * Busca documentos (placeholder - será implementado com RAG)
 */
export const buscarDocumento: ToolHandler<
  { query: string; categoria?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { query, categoria, limite = 5 } = input;

  // TODO: Implementar busca vetorial quando RAG estiver pronto

  console.log('[buscarDocumento] RAG não implementado ainda. Query:', query);

  return {
    message: 'Busca em documentos será implementada em breve',
    query,
    categoria,
  };
};

// ============================================
// API HANDLERS (Dados Externos)
// ============================================

/**
 * Busca atualidades via Perplexity (placeholder)
 */
export const buscarAtualidades: ToolHandler<
  { query: string; foco?: string; recencia?: string },
  unknown
> = async (input, context) => {
  const { query, foco = 'geral', recencia = 'semana' } = input;

  // TODO: Implementar chamada à API Perplexity

  console.log('[buscarAtualidades] Perplexity não implementado ainda. Query:', query);

  return {
    message: 'Busca de atualidades será implementada em breve',
    query,
    foco,
    recencia,
  };
};

// ============================================
// LLM HANDLERS
// ============================================

/**
 * Gera resposta geral usando LLM
 */
export const respostaGeral: ToolHandler<
  { pergunta: string; contexto?: string },
  unknown
> = async (input, context) => {
  const { pergunta, contexto } = input;

  // Este handler é chamado como fallback
  // A geração real é feita pelo orchestrator

  return {
    pergunta,
    contexto,
    needsLLMGeneration: true,
  };
};

// ============================================
// EXPORT ALL HANDLERS
// ============================================

export const homeHandlers: Record<string, ToolHandler> = {
  buscarMunicipio,
  buscarPopulacao,
  buscarEstabelecimentoSaude,
  buscarEscola,
  buscarProtocolo,
  buscarDocumento,
  buscarAtualidades,
  respostaGeral,
};

export default homeHandlers;
