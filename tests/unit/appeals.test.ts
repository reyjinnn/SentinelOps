import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManagerService } from '../../src/services/integrations/token-manager.service';
import { ShopeeAppealClient } from '../../src/services/integrations/clients/shopee-appeal.client';
import { TiktokAppealClient } from '../../src/services/integrations/clients/tiktok-appeal.client';
import { env } from '../../src/config/env';
import { encryptCredentials } from '../../src/utils/security';
import { db } from '../../src/db/database';

const executeTakeFirstMock = vi.fn();

vi.mock('../../src/db/database', () => ({
  db: {
    selectFrom: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      executeTakeFirst: executeTakeFirstMock,
    })),
  },
}));

describe('Appeal Integrations (Sprint 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TokenManagerService', () => {
    it('should decrypt and return a valid access token', async () => {
      const mockTokenData = { token: 'mock_shopee_token_123' };
      const encrypted = encryptCredentials(JSON.stringify(mockTokenData), env.ENCRYPTION_MASTER_KEY);

      // Mock DB return
      executeTakeFirstMock.mockResolvedValueOnce({
        id: 'store-123',
        is_active: true,
        credentials_encrypted: encrypted,
      });

      const token = await TokenManagerService.getValidAccessToken('store-123');
      expect(token).toBe('mock_shopee_token_123');
    });

    it('should throw an error if store is inactive', async () => {
      executeTakeFirstMock.mockResolvedValueOnce({
        id: 'store-123',
        is_active: false,
      });

      await expect(TokenManagerService.getValidAccessToken('store-123')).rejects.toThrow('Store connection is inactive');
    });
  });

  describe('Marketplace Appeal Clients (Mock Mode)', () => {
    it('ShopeeClient should return a mocked external appeal ID', async () => {
      const result = await ShopeeAppealClient.submitDisputeAppeal(
        'token',
        'ext-store-id',
        'DSP-123',
        'Markdown Content',
        ['img.jpg']
      );

      expect(result.success).toBe(true);
      expect(result.external_appeal_id).toMatch(/^SHP-APL-\d{4}-\d{4}$/);
    });

    it('TiktokClient should return a mocked external appeal ID', async () => {
      const result = await TiktokAppealClient.submitDisputeAppeal(
        'token',
        'ext-store-id',
        'DSP-456',
        'Markdown Content',
        ['img.jpg']
      );

      expect(result.success).toBe(true);
      expect(result.external_appeal_id).toMatch(/^TT-APL-\d{4}-\d{4}$/);
    });
  });
});
