import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import crypto from 'crypto';
import { ingestionRoutes } from '../src/routes/ingestion.route';
import { env } from '../src/config/env';

vi.mock('ioredis', () => {
  const Redis = vi.fn();
  const state: Record<string, string> = {};
  Redis.prototype.set = vi.fn(async (key, value, mode, ttl, nx) => {
    if (nx === 'NX' && state[key]) return null;
    state[key] = value;
    return 'OK';
  });
  return { default: Redis };
});

vi.mock('bullmq', () => ({
  Queue: class {
    add = vi.fn().mockResolvedValue({ id: 'job-123' });
  }
}));

describe('Webhook Ingestion API', () => {
  const buildFastify = () => {
    const fastify = Fastify();
    fastify.register(ingestionRoutes);
    return fastify;
  };

  const generateSignature = (payload: any, secret: string) => {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload), 'utf8').digest('hex');
  };

  it('1. Should accept valid Shopee payload and normalize it to QUEUED (202)', async () => {
    const fastify = buildFastify();
    
    const payload = {
      event_id: 'evt-123',
      order_sn: 'ORD123',
      return_sn: 'RET123',
      refund_amount: 45000,
    };
    
    const signature = generateSignature(payload, env.SHOPEE_WEBHOOK_SECRET);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/v1/disputes/evaluate',
      headers: {
        'x-tenant-id': 'uuid-tenant-1',
        'x-marketplace-source': 'SHOPEE',
        'x-signature': signature,
      },
      payload,
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.status).toBe('QUEUED');
  });

  it('2. Should reject invalid HMAC signature with 401', async () => {
    const fastify = buildFastify();
    
    const payload = {
      event_id: 'evt-999',
    };

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/v1/disputes/evaluate',
      headers: {
        'x-tenant-id': 'uuid-tenant-1',
        'x-marketplace-source': 'SHOPEE',
        'x-signature': 'invalid_signature_hex',
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
  });

  it('3. Should return ALREADY_ENQUEUED (200) for duplicate events (Idempotency)', async () => {
    const fastify = buildFastify();
    
    const payload = {
      event_id: 'evt-duplicate',
      order_sn: 'ORD456',
      refund_amount: 10000,
    };
    
    const signature = generateSignature(payload, env.SHOPEE_WEBHOOK_SECRET);

    await fastify.inject({
      method: 'POST',
      url: '/api/v1/disputes/evaluate',
      headers: {
        'x-tenant-id': 'uuid-tenant-1',
        'x-marketplace-source': 'SHOPEE',
        'x-signature': signature,
      },
      payload,
    });

    const duplicateResponse = await fastify.inject({
      method: 'POST',
      url: '/api/v1/disputes/evaluate',
      headers: {
        'x-tenant-id': 'uuid-tenant-1',
        'x-marketplace-source': 'SHOPEE',
        'x-signature': signature,
      },
      payload,
    });

    expect(duplicateResponse.statusCode).toBe(200);
    const body = JSON.parse(duplicateResponse.body);
    expect(body.status).toBe('ALREADY_ENQUEUED');
  });

  it('4. Should return 400 Bad Request for generic webhook failing Zod validation', async () => {
    const fastify = buildFastify();
    
    const invalidPayload = {
      event_id: 'evt-invalid',
    };

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/v1/disputes/evaluate',
      headers: {
        'x-tenant-id': 'uuid-tenant-1',
        'x-marketplace-source': 'GENERIC',
      },
      payload: invalidPayload,
    });

    expect(response.statusCode).toBe(400);
  });
});
