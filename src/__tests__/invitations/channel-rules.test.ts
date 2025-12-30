import { describe, it, expect } from 'vitest';
import {
  getAllowedChannels,
  getForcedChannels,
  getValidationErrors,
  isPwaOnly,
} from '@/lib/invitations/channel-rules';

describe('Invitation Channel Rules', () => {
  describe('getAllowedChannels', () => {
    it('should only allow WhatsApp for PWA-only invitations', () => {
      const result = getAllowedChannels({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(result.email).toBe(false);
      expect(result.whatsapp).toBe(true);
      expect(result.both).toBe(false);
    });

    it('should disable all channels for PWA-only without phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: false,
      });
      
      expect(result.email).toBe(false);
      expect(result.whatsapp).toBe(false);
      expect(result.both).toBe(false);
    });

    it('should allow all channels for Platform-only with phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.email).toBe(true);
      expect(result.whatsapp).toBe(true);
      expect(result.both).toBe(true);
    });

    it('should allow only email for Platform-only without phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: false,
      });
      
      expect(result.email).toBe(true);
      expect(result.whatsapp).toBe(false);
      expect(result.both).toBe(false);
    });

    it('should allow all channels for Both access with phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.email).toBe(true);
      expect(result.whatsapp).toBe(true);
      expect(result.both).toBe(true);
    });
  });

  describe('getForcedChannels', () => {
    it('should force WhatsApp for PWA-only', () => {
      const result = getForcedChannels({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(result.forcedChannel).toBe('whatsapp');
      expect(result.reason).toContain('WhatsApp');
    });

    it('should not force any channel for Platform-only', () => {
      const result = getForcedChannels({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.forcedChannel).toBeNull();
      expect(result.reason).toBeNull();
    });

    it('should not force any channel for Both access', () => {
      const result = getForcedChannels({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.forcedChannel).toBeNull();
      expect(result.reason).toBeNull();
    });
  });

  describe('getValidationErrors', () => {
    it('should return error when email is selected for PWA-only', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
        selectedChannel: 'email',
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'channel')).toBe(true);
    });

    it('should return error when both is selected for PWA-only', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
        selectedChannel: 'both',
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'channel')).toBe(true);
    });

    it('should return phone error when PWA-only without phone', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: false,
        selectedChannel: 'whatsapp',
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'phone')).toBe(true);
    });

    it('should return no errors for valid PWA-only with WhatsApp', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
        selectedChannel: 'whatsapp',
      });
      
      expect(errors.length).toBe(0);
    });

    it('should return no errors for Platform with email', () => {
      const errors = getValidationErrors({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: false,
        selectedChannel: 'email',
      });
      
      expect(errors.length).toBe(0);
    });

    it('should return phone error when WhatsApp selected without phone', () => {
      const errors = getValidationErrors({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: false,
        selectedChannel: 'whatsapp',
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'phone')).toBe(true);
    });
  });

  describe('isPwaOnly', () => {
    it('should return true for "app" product', () => {
      expect(isPwaOnly('app')).toBe(true);
    });

    it('should return false for "platform" product', () => {
      expect(isPwaOnly('platform')).toBe(false);
    });

    it('should return false for "both" product', () => {
      expect(isPwaOnly('both')).toBe(false);
    });
  });
});
