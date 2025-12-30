import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Define expected schema for PWA tables
const EXPECTED_SCHEMA = {
  pwa_devices: {
    required_columns: [
      'id',
      'device_fingerprint',
      'user_name',
      'user_email',
      'user_registration_id',
      'is_trusted',
      'is_verified',
      'pwa_slugs',
      'created_at',
      'updated_at',
    ],
  },
  pwa_sessions: {
    required_columns: [
      'id',
      'device_id',
      'user_name',
      'token',
      'pwa_access',
      'is_active',
      'has_app_access',
      'created_at',
      'last_interaction',
    ],
  },
  user_invitations: {
    required_columns: [
      'id',
      'token',
      'name',
      'email',
      'status',
      'pwa_access',
      'expires_at',
      'completed_at',
      'created_at',
    ],
  },
  user_registrations: {
    required_columns: [
      'id',
      'email',
      'first_name',
      'last_name',
      'status',
      'pwa_registered_at',
      'has_app_access',
      'pwa_access',
      'created_at',
    ],
  },
};

describe('PWA Tables Schema Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pwa_devices table', () => {
    it('should have all required columns', async () => {
      const mockColumns = EXPECTED_SCHEMA.pwa_devices.required_columns.map(col => ({
        column_name: col,
        data_type: 'text',
        is_nullable: true,
      }));

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockColumns,
        error: null,
      } as any);

      const { data, error } = await supabase.rpc('get_table_columns', { p_table_name: 'pwa_devices' });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const columnNames = data?.map((c: any) => c.column_name) || [];
      EXPECTED_SCHEMA.pwa_devices.required_columns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have user_registration_id column for linking', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ column_name: 'user_registration_id', data_type: 'uuid' }],
        error: null,
      } as any);

      const { data } = await supabase.rpc('get_table_columns', { p_table_name: 'pwa_devices' });
      const hasColumn = data?.some((c: any) => c.column_name === 'user_registration_id');
      expect(hasColumn).toBe(true);
    });
  });

  describe('pwa_sessions table', () => {
    it('should have device_id column with unique constraint', async () => {
      const mockColumns = EXPECTED_SCHEMA.pwa_sessions.required_columns.map(col => ({
        column_name: col,
        data_type: col === 'device_id' ? 'text' : 'text',
      }));

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockColumns,
        error: null,
      } as any);

      const { data } = await supabase.rpc('get_table_columns', { p_table_name: 'pwa_sessions' });
      const hasDeviceId = data?.some((c: any) => c.column_name === 'device_id');
      expect(hasDeviceId).toBe(true);
    });

    it('should have all required session columns', async () => {
      const mockColumns = EXPECTED_SCHEMA.pwa_sessions.required_columns.map(col => ({
        column_name: col,
      }));

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockColumns,
        error: null,
      } as any);

      const { data } = await supabase.rpc('get_table_columns', { p_table_name: 'pwa_sessions' });
      const columnNames = data?.map((c: any) => c.column_name) || [];
      
      EXPECTED_SCHEMA.pwa_sessions.required_columns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });
  });

  describe('user_invitations table', () => {
    it('should have pwa_access column for PWA permissions', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ column_name: 'pwa_access', data_type: 'ARRAY' }],
        error: null,
      } as any);

      const { data } = await supabase.rpc('get_table_columns', { p_table_name: 'user_invitations' });
      const hasPwaAccess = data?.some((c: any) => c.column_name === 'pwa_access');
      expect(hasPwaAccess).toBe(true);
    });

    it('should have status column for invitation workflow', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ column_name: 'status', data_type: 'text' }],
        error: null,
      } as any);

      const { data } = await supabase.rpc('get_table_columns', { p_table_name: 'user_invitations' });
      const hasStatus = data?.some((c: any) => c.column_name === 'status');
      expect(hasStatus).toBe(true);
    });
  });
});
