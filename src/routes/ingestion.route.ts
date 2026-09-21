import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyHmacSha256 } from '../utils/crypto';
import { env } from '../config/env';
import { mapShopeeToCanonical } from '../adapters/shopee.adapter';
import { mapTikTokToCanonical } from '../adapters/tiktok.adapter';
import { mapGenericToCanonical } from '../adapters/generic.adapter';
import { enqueueDisputeEvent } from '../queues/dispute-queue';
import { CanonicalDisputeEvent } from '../schemas/canonical-dispute';

export async function ingestionRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/disputes/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const source = request.headers['x-marketplace-source'] as string || (request.query as any)['source'] as string || 'GENERIC';
      const signature = request.headers['x-signature'] as string;
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ success: false, error: 'Missing x-tenant-id header' });
      }

      const rawPayload = JSON.stringify(request.body);
      const payloadObj = request.body as any;

      let canonicalEvent: CanonicalDisputeEvent;

      if (source === 'SHOPEE') {
        if (!signature || !verifyHmacSha256(rawPayload, signature, env.SHOPEE_WEBHOOK_SECRET)) {
          return reply.status(401).send({ success: false, error: 'Invalid HMAC signature' });
        }
        canonicalEvent = mapShopeeToCanonical(payloadObj, tenantId);
      } else if (source === 'TIKTOK_SHOP') {
        if (!signature || !verifyHmacSha256(rawPayload, signature, env.TIKTOK_WEBHOOK_SECRET)) {
          return reply.status(401).send({ success: false, error: 'Invalid HMAC signature' });
        }
        canonicalEvent = mapTikTokToCanonical(payloadObj, tenantId);
      } else {
        canonicalEvent = mapGenericToCanonical(payloadObj, tenantId);
      }

      const result = await enqueueDisputeEvent(canonicalEvent);

      if (result.status === 'ALREADY_ENQUEUED') {
        return reply.status(200).send({
          success: true,
          event_id: canonicalEvent.event_id,
          status: result.status,
        });
      }

      return reply.status(202).send({
        success: true,
        event_id: canonicalEvent.event_id,
        status: result.status,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message || 'Bad Request',
      });
    }
  });
}
