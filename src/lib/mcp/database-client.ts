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

export interface PopMunicipioData {
  codigo_ibge: number;
  nome: string;
  uf: string;
  regiao: string;
  populacao_estimada?: number;
  populacao_censo?: number;
  ano_populacao?: number;
  area_km2?: number;
  densidade_demografica?: number;
  pib?: number;
  pib_per_capita?: number;
  idh?: number;
  latitude?: number;
  longitude?: number;
  capital?: boolean;
  mesorregiao?: string;
  microrregiao?: string;
}

/**
 * Fetch municipality data from brasil-data-hub
 */
export async function fetchPopMunicipio(
  termo: string,
  uf?: string
): Promise<PopMunicipioData[] | null> {
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
        .eq('codigo_ibge', parseInt(termo))
        .single();

      if (error) {
        console.error('[fetchPopMunicipio] Error:', error);
        return null;
      }

      return data ? [data] : null;
    }

    // Search by name
    let query = client
      .from('pop_municipios')
      .select('*')
      .ilike('nome', `%${termo}%`);

    if (uf) {
      query = query.eq('uf', uf.toUpperCase());
    }

    const { data, error } = await query.limit(10);

    if (error) {
      console.error('[fetchPopMunicipio] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchPopMunicipio] Exception:', error);
    return null;
  }
}

/**
 * Fetch population history for a municipality
 */
export async function fetchPopulacaoHistorico(
  codigoIbge: number,
  anos?: number[]
): Promise<unknown[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopulacaoHistorico] brasil-data-hub not connected');
    return null;
  }

  try {
    let query = client
      .from('pop_municipios_historico')
      .select('*')
      .eq('codigo_ibge', codigoIbge)
      .order('ano', { ascending: false });

    if (anos && anos.length > 0) {
      query = query.in('ano', anos);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      // Table might not exist
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
