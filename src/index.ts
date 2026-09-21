import Fastify from 'fastify';
import { env } from './config/env';
import { ingestionRoutes } from './routes/ingestion.route';

import { startDisputeWorker } from './workers/dispute.worker';

const fastify = Fastify({
  logger: true,
});

fastify.register(ingestionRoutes);

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
