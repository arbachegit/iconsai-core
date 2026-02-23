/**
 * useAgentConfig - Hook for fetching agent configuration from database
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Fetches agent configuration including welcome messages from iconsai_agents table.
 * Supports returning user messages and container configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentDbConfig {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  icon: string;
  color: string;
  edge_function_name: string;
  is_active: boolean;
  sort_order: number;
  welcome_message: string | null;
  welcome_message_returning: string | null;
  is_home_container: boolean;
  container_config: Record<string, unknown> | null;
}

export interface UseAgentConfigOptions {
  slug: string;
  deviceId?: string;
}

export interface UseAgentConfigReturn {
  config: AgentDbConfig | null;
  welcomeMessage: string;
  isReturningUser: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_WELCOME = 'Olá! Como posso ajudar?';

export function useAgentConfig(options: UseAgentConfigOptions): UseAgentConfigReturn {
  const [config, setConfig] = useState<AgentDbConfig | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch agent configuration
      const { data: agentData, error: agentError } = await supabase
        .from('iconsai_agents')
        .select('*')
        .eq('slug', options.slug)
        .single();

      if (agentError) {
        console.warn('[useAgentConfig] Agent not found in database:', options.slug);
        setConfig(null);
        setIsLoading(false);
        return;
      }

      setConfig(agentData as AgentDbConfig);

      // Check if returning user (has previous activity)
      if (options.deviceId) {
        const { data: activityData } = await supabase
          .from('pwa_user_activity')
          .select('last_module_slug')
          .eq('device_id', options.deviceId)
          .single();

        if (activityData?.last_module_slug) {
          setIsReturningUser(true);
        }
      }
    } catch (err) {
      console.error('[useAgentConfig] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  }, [options.slug, options.deviceId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Determine which welcome message to use
  const welcomeMessage = (() => {
    if (!config) return DEFAULT_WELCOME;

    if (isReturningUser && config.welcome_message_returning) {
      return config.welcome_message_returning;
    }

    return config.welcome_message || DEFAULT_WELCOME;
  })();

  return {
    config,
    welcomeMessage,
    isReturningUser,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

export default useAgentConfig;
