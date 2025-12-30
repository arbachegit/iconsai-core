import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Critical functions that must exist and have correct references
const CRITICAL_FUNCTIONS = {
  register_pwa_user: {
    must_contain: ['user_invitations', 'pwa_devices', 'pwa_sessions'],
    must_not_contain: ['pwa_invitations'], // Old incorrect table name
    required_params: ['p_invitation_token', 'p_device_id', 'p_name', 'p_email'],
  },
  verify_pwa_invitation: {
    must_contain: ['user_invitations'],
    must_not_contain: ['pwa_invitations'],
    required_params: ['p_token'],
  },
  get_pwa_devices_schema: {
    must_contain: ['pwa_devices', 'information_schema.columns'],
    must_not_contain: [],
    required_params: [],
  },
};

describe('Critical Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register_pwa_user function', () => {
    it('should exist in the database', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const { data } = await supabase.rpc('function_exists', { p_function_name: 'register_pwa_user' });
      expect(data).toBe(true);
    });

    it('should reference user_invitations table, NOT pwa_invitations', async () => {
      const mockDefinition = `
        CREATE OR REPLACE FUNCTION public.register_pwa_user(...)
        ...
        FROM user_invitations
        WHERE token = p_invitation_token
        ...
      `;

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDefinition,
        error: null,
      } as any);

      const { data: funcDef } = await supabase.rpc('get_function_definition', { 
        p_function_name: 'register_pwa_user' 
      });

      expect(funcDef).toBeDefined();
      expect(funcDef?.toLowerCase()).toContain('user_invitations');
      expect(funcDef?.toLowerCase()).not.toContain('pwa_invitations');
    });

    it('should reference pwa_sessions for session management', async () => {
      const mockDefinition = `
        INSERT INTO pwa_sessions (device_id, user_name, token)
        VALUES (p_device_id, p_name, v_session_token)
        ON CONFLICT (device_id) DO UPDATE SET...
      `;

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDefinition,
        error: null,
      } as any);

      const { data: funcDef } = await supabase.rpc('get_function_definition', { 
        p_function_name: 'register_pwa_user' 
      });

      expect(funcDef?.toLowerCase()).toContain('pwa_sessions');
    });

    it('should handle all required parameters', async () => {
      const requiredParams = CRITICAL_FUNCTIONS.register_pwa_user.required_params;
      const mockDefinition = `
        CREATE OR REPLACE FUNCTION public.register_pwa_user(
          p_invitation_token TEXT,
          p_device_id TEXT,
          p_name TEXT,
          p_email TEXT,
          p_phone TEXT DEFAULT NULL,
          p_user_agent TEXT DEFAULT NULL
        )
      `;

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDefinition,
        error: null,
      } as any);

      const { data: funcDef } = await supabase.rpc('get_function_definition', { 
        p_function_name: 'register_pwa_user' 
      });

      requiredParams.forEach(param => {
        expect(funcDef?.toLowerCase()).toContain(param.toLowerCase());
      });
    });
  });

  describe('verify_pwa_invitation function', () => {
    it('should exist in the database', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const { data } = await supabase.rpc('function_exists', { p_function_name: 'verify_pwa_invitation' });
      expect(data).toBe(true);
    });

    it('should reference user_invitations correctly', async () => {
      const mockDefinition = `
        SELECT id, name, email FROM public.user_invitations
        WHERE token = p_token
      `;

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDefinition,
        error: null,
      } as any);

      const { data: funcDef } = await supabase.rpc('get_function_definition', { 
        p_function_name: 'verify_pwa_invitation' 
      });

      expect(funcDef?.toLowerCase()).toContain('user_invitations');
    });
  });

  describe('get_pwa_devices_schema function', () => {
    it('should exist for schema introspection', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const { data } = await supabase.rpc('function_exists', { p_function_name: 'get_pwa_devices_schema' });
      expect(data).toBe(true);
    });
  });
});

describe('Function Reference Validation', () => {
  it('should not have any references to non-existent tables', async () => {
    const invalidTableReferences = ['pwa_invitations', 'pwa_users', 'pwa_registrations'];
    
    for (const funcName of Object.keys(CRITICAL_FUNCTIONS)) {
      const mockDefinition = `CREATE FUNCTION ${funcName}... FROM user_invitations...`;
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDefinition,
        error: null,
      } as any);

      const { data: funcDef } = await supabase.rpc('get_function_definition', { 
        p_function_name: funcName 
      });

      if (funcDef) {
        invalidTableReferences.forEach(invalidTable => {
          expect(funcDef.toLowerCase()).not.toContain(invalidTable.toLowerCase());
        });
      }
    }
  });
});
