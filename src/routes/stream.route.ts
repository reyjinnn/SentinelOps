import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { env } from '../config/env';

export async function streamRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/disputes/:id/stream', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: disputeId } = request.params;
    const channel = `dispute:events:${disputeId}`;

    const subscriber = new Redis(env.REDIS_URL);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    // Ensure CORS headers are flushed immediately (handled by @fastify/cors mostly)
    reply.raw.flushHeaders();

    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        reply.raw.write(`data: ${message}\n\n`);
        
        // Cleanup if DECISION_FINAL is reached
        if (message.includes('DECISION_FINAL')) {
          subscriber.unsubscribe(channel);
          subscriber.quit();
          reply.raw.end();
        }
      }
    });

    request.raw.on('close', () => {
      subscriber.unsubscribe(channel);
      subscriber.quit();
    });

    // Send initial heartbeat to establish connection immediately
    reply.raw.write(`: connected\n\n`);
  });
}
