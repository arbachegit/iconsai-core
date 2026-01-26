/**
 * MCP Database Client - Multi-Database Connection Manager
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Manages connections to multiple Supabase/PostgreSQL databases via MCP pattern.
 * Supports:
 * - brasil-data-hub: Geographic/demographic data
 * - fiscal-municipal: Fiscal system data (iconsai-core)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// DATABASE CONFIGURATION
// ============================================

export interface DatabaseConfig {
  name: string;
  displayName: string;
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  description: string;
}

// Database registry - configured via environment variables
export const DATABASE_CONFIGS: Record<string, DatabaseConfig> = {
  'brasil-data-hub': {
    name: 'brasil-data-hub',
    displayName: 'Brasil Data Hub',
    url: import.meta.env.VITE_BRASIL_DATA_HUB_URL || '',
    anonKey: import.meta.env.VITE_BRASIL_DATA_HUB_ANON_KEY || '',
    serviceRoleKey: import.meta.env.VITE_BRASIL_DATA_HUB_SERVICE_KEY,
    description: 'Dados geográficos e demográficos do Brasil (geo_municipios, pop_municipios, pop_estados)',
  },
  'fiscal-municipal': {
    name: 'fiscal-municipal',
    displayName: 'Fiscal Municipal',
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    description: 'Sistema fiscal municipal (diagnosticos, indicadores, municipios)',
  },
};

// ============================================
// MCP DATABASE CLIENT
// ============================================

class MCPDatabaseClient {
  private clients: Map<string, SupabaseClient> = new Map();
  private initialized = false;

  /**
   * Initialize database connections
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    for (const [name, config] of Object.entries(DATABASE_CONFIGS)) {
      if (config.url && config.anonKey) {
        try {
          const client = createClient(config.url, config.anonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          this.clients.set(name, client);
          console.log(`[MCPDatabaseClient] Connected to ${name}`);
        } catch (error) {
          console.warn(`[MCPDatabaseClient] Failed to connect to ${name}:`, error);
        }
      } else {
        console.warn(`[MCPDatabaseClient] Missing config for ${name}`);
      }
    }

    this.initialized = true;
  }

  /**
   * Get a database client by name
   */
  getClient(dbName: string): SupabaseClient | null {
    return this.clients.get(dbName) || null;
  }

  /**
   * Get the brasil-data-hub client
   */
  getBrasilDataHub(): SupabaseClient | null {
    return this.clients.get('brasil-data-hub');
  }

  /**
   * Get the fiscal-municipal (main) client
   */
  getFiscalMunicipal(): SupabaseClient | null {
    return this.clients.get('fiscal-municipal');
  }

  /**
   * Check if a database is connected
   */
  isConnected(dbName: string): boolean {
    return this.clients.has(dbName);
  }

  /**
   * Get list of connected databases
   */
  getConnectedDatabases(): string[] {
    return Array.from(this.clients.keys());
  }
}

// Singleton instance
export const mcpDatabaseClient = new MCPDatabaseClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Initialize MCP database connections
 * Call this early in the app lifecycle
 */
export async function initializeMCPDatabases(): Promise<void> {
  await mcpDatabaseClient.initialize();
}

/**
 * Get brasil-data-hub client for geographic/demographic queries
 */
export function getBrasilDataHubClient(): SupabaseClient | null {
  return mcpDatabaseClient.getBrasilDataHub();
}

/**
 * Get fiscal-municipal client for fiscal system queries
 */
export function getFiscalMunicipalClient(): SupabaseClient | null {
  return mcpDatabaseClient.getFiscalMunicipal();
}

// ============================================
// DATA ACCESS FUNCTIONS
// ============================================

/**
 * Population data from brasil-data-hub.pop_municipios
 * Time series table with demographic data per year
 */
export interface PopMunicipioData {
  id: string;
  cod_ibge: number;
  nome_municipio: string;
  uf: string;
  ano: number;
  populacao: number;
  faixa_populacional?: string;
  fonte?: string;
  data_referencia?: string;
  data_coleta?: string;
  atualizado_em?: string;
  // Demographic breakdown
  populacao_urbana?: number;
  populacao_rural?: number;
  // Mortality data
  obitos_total?: number;
  obitos_masculinos?: number;
  obitos_femininos?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  // Birth data
  nascimentos?: number;
}

/**
 * Aggregated municipality data with latest year
 */
export interface MunicipioResumo {
  cod_ibge: number;
  nome_municipio: string;
  uf: string;
  populacao_atual: number;
  ano_referencia: number;
  faixa_populacional?: string;
  populacao_urbana?: number;
  populacao_rural?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  fonte?: string;
}

/**
 * Fetch latest municipality data from brasil-data-hub
 * Gets the most recent year for each municipality
 */
export async function fetchPopMunicipio(
  termo: string,
  uf?: string
): Promise<MunicipioResumo[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopMunicipio] brasil-data-hub not connected');
    return null;
  }

  try {
    // Check if it's IBGE code (7 digits)
    if (/^\d{7}$/.test(termo)) {
      const { data, error } = await client
        .from('pop_municipios')
        .select('*')
        .eq('cod_ibge', parseInt(termo))
        .order('ano', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('[fetchPopMunicipio] Error:', error);
        return null;
      }

      if (data) {
        return [{
          cod_ibge: data.cod_ibge,
          nome_municipio: data.nome_municipio,
          uf: data.uf,
          populacao_atual: data.populacao,
          ano_referencia: data.ano,
          faixa_populacional: data.faixa_populacional,
          populacao_urbana: data.populacao_urbana,
          populacao_rural: data.populacao_rural,
          taxa_mortalidade: data.taxa_mortalidade,
          mortalidade_infantil: data.mortalidade_infantil,
          fonte: data.fonte,
        }];
      }
      return null;
    }

    // Search by name - get latest year for each matching municipality
    // Using distinct on cod_ibge ordered by ano desc
    let query = client
      .from('pop_municipios')
      .select('cod_ibge, nome_municipio, uf, ano, populacao, faixa_populacional, populacao_urbana, populacao_rural, taxa_mortalidade, mortalidade_infantil, fonte')
      .ilike('nome_municipio', `%${termo}%`)
      .order('ano', { ascending: false });

    if (uf) {
      query = query.eq('uf', uf.toUpperCase());
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('[fetchPopMunicipio] Error:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Group by cod_ibge and take only the most recent year
    const latestByMunicipio = new Map<number, MunicipioResumo>();

    for (const row of data) {
      if (!latestByMunicipio.has(row.cod_ibge)) {
        latestByMunicipio.set(row.cod_ibge, {
          cod_ibge: row.cod_ibge,
          nome_municipio: row.nome_municipio,
          uf: row.uf,
          populacao_atual: row.populacao,
          ano_referencia: row.ano,
          faixa_populacional: row.faixa_populacional,
          populacao_urbana: row.populacao_urbana,
          populacao_rural: row.populacao_rural,
          taxa_mortalidade: row.taxa_mortalidade,
          mortalidade_infantil: row.mortalidade_infantil,
          fonte: row.fonte,
        });
      }
    }

    return Array.from(latestByMunicipio.values()).slice(0, 10);
  } catch (error) {
    console.error('[fetchPopMunicipio] Exception:', error);
    return null;
  }
}

/**
 * Fetch population time series for a municipality
 * Returns all years available for the given municipality
 */
export async function fetchPopulacaoHistorico(
  codigoIbge: number,
  anos?: number[]
): Promise<PopMunicipioData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopulacaoHistorico] brasil-data-hub not connected');
    return null;
  }

  try {
    let query = client
      .from('pop_municipios')
      .select('*')
      .eq('cod_ibge', codigoIbge)
      .order('ano', { ascending: false });

    if (anos && anos.length > 0) {
      query = query.in('ano', anos);
    }

    const { data, error } = await query.limit(30);

    if (error) {
      console.warn('[fetchPopulacaoHistorico] Error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchPopulacaoHistorico] Exception:', error);
    return null;
  }
}

/**
 * Fetch demographic indicators for a municipality
 * Includes mortality rates and birth data
 */
export async function fetchIndicadoresDemograficos(
  codigoIbge: number,
  ano?: number
): Promise<PopMunicipioData | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchIndicadoresDemograficos] brasil-data-hub not connected');
    return null;
  }

  try {
    let query = client
      .from('pop_municipios')
      .select('*')
      .eq('cod_ibge', codigoIbge);

    if (ano) {
      query = query.eq('ano', ano);
    } else {
      query = query.order('ano', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error) {
      console.warn('[fetchIndicadoresDemograficos] Error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchIndicadoresDemograficos] Exception:', error);
    return null;
  }
}

/**
 * Fetch state data from brasil-data-hub
 */
export async function fetchEstado(uf: string): Promise<unknown | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchEstado] brasil-data-hub not connected');
    return null;
  }

  try {
    const { data, error } = await client
      .from('pop_estados')
      .select('*')
      .eq('uf', uf.toUpperCase())
      .single();

    if (error) {
      console.error('[fetchEstado] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchEstado] Exception:', error);
    return null;
  }
}

export default mcpDatabaseClient;
