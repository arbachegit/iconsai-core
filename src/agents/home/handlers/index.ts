/**
 * Home Agent Handlers
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Implementation of tools defined in mcp-config.ts
 */

import type { ToolHandler, ExecutionContext } from '@/lib/mcp/types';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// SQL HANDLERS (Dados Estruturados)
// ============================================

/**
 * Busca município por nome ou código IBGE
 */
export const buscarMunicipio: ToolHandler<
  { termo: string; uf?: string },
  unknown
> = async (input, context) => {
  const { termo, uf } = input;

  // Se é código IBGE (7 dígitos)
  if (/^\d{7}$/.test(termo)) {
    const { data, error } = await supabase
      .from('municipios')
      .select('*')
      .eq('codigo_ibge', termo)
      .single();

    if (error) {
      console.error('[buscarMunicipio] Error:', error);
      return null;
    }
    return data;
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
 * Busca dados populacionais
 */
export const buscarPopulacao: ToolHandler<
  { codigo_ibge?: string; municipio?: string },
  unknown
> = async (input, context) => {
  const { codigo_ibge, municipio } = input;

  let query = supabase
    .from('municipios')
    .select('codigo_ibge, nome, uf, populacao, area_km2');

  if (codigo_ibge) {
    query = query.eq('codigo_ibge', codigo_ibge);
  } else if (municipio) {
    query = query.ilike('nome', `%${municipio}%`);
  } else {
    return null;
  }

  const { data, error } = await query.limit(5);

  if (error) {
    console.error('[buscarPopulacao] Error:', error);
    return null;
  }

  return data;
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
    .select('*')
    .eq('codigo_ibge_municipio', mun.codigo_ibge);

  if (tipo !== 'TODOS') {
    query = query.eq('tipo_estabelecimento', tipo);
  }

  const { data, error } = await query.limit(limite);

  if (error) {
    console.error('[buscarEstabelecimentoSaude] Error:', error);
    return null;
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
    .select('*')
    .eq('codigo_ibge_municipio', mun.codigo_ibge);

  if (tipo !== 'TODOS') {
    query = query.eq('etapa_ensino', tipo);
  }

  const { data, error } = await query.limit(limite);

  if (error) {
    console.error('[buscarEscola] Error:', error);
    return null;
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
