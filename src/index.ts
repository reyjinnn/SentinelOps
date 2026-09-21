import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { ingestionRoutes } from './routes/ingestion.route';
import { streamRoutes } from './routes/stream.route';

import { startDisputeWorker } from './workers/dispute.worker';

const fastify = Fastify({
  logger: true,
});

fastify.register(helmet);
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

fastify.register(cors, {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
});

fastify.register(ingestionRoutes);
fastify.register(streamRoutes);

const start = async () => {
  try {
    // Start BullMQ Worker
    const worker = startDisputeWorker();
    fastify.log.info('BullMQ Worker started');

    await fastify.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' });
    console.log(`Server listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
