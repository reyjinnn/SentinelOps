import { FastifyInstance } from 'fastify';
import { db } from '../db/database';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const marketplaceCallbackRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/api/v1/callbacks/marketplace-resolution', async (request, reply) => {
    const { external_appeal_id, outcome, notes } = request.body as {
      external_appeal_id: string;
      outcome: 'WON' | 'LOST';
      notes?: string;
    };

    if (!external_appeal_id || !outcome) {
      return reply.status(400).send({ error: 'Missing external_appeal_id or outcome' });
    }

    try {
      // 1. Find the corresponding dispute dossier
      const dossier = await db.selectFrom('dispute_dossiers')
        .where('external_appeal_id', '=', external_appeal_id)
        .selectAll()
        .executeTakeFirst();

      if (!dossier) {
        return reply.status(404).send({ error: 'Dossier with this external appeal ID not found' });
      }

      // 2. Find the dispute and order
      const dispute = await db.selectFrom('disputes')
        .where('id', '=', dossier.dispute_id)
        .selectAll()
        .executeTakeFirst();

      if (!dispute) throw new Error('Dispute not found');

      const order = await db.selectFrom('orders')
        .where('id', '=', dispute.order_id)
        .selectAll()
        .executeTakeFirst();

      if (!order) throw new Error('Order not found');

      // 3. Process the outcome
      const finalStatus = outcome === 'WON' ? 'RESOLVED_WON' : 'RESOLVED_LOST';

      await db.transaction().execute(async (trx) => {
        // Update dispute status
        await trx.updateTable('disputes')
          .set({ status: finalStatus })
          .where('id', '=', dispute.id)
          .execute();

        // If WON, release the escrow
        if (outcome === 'WON') {
          await trx.updateTable('orders')
            .set({ escrow_status: 'RELEASED_TO_SELLER' })
            .where('id', '=', order.id)
            .execute();

          await trx.insertInto('ledger_mutations')
            .values({
              tenant_id: dispute.tenant_id,
              dispute_id: dispute.id,
              amount_idr: order.total_amount_idr,
              mutation_type: 'ESCROW_RELEASE',
              balance_state_before: 'FROZEN',
              balance_state_after: 'RELEASED_TO_SELLER'
            })
            .execute();
        }
      });

      // 4. Emit SSE Event to Cockpit
      const publisher = new IORedis(env.REDIS_URL);
      const eventPayload = {
        type: 'RESOLUTION_OUTCOME',
        dispute_id: dispute.id,
        external_appeal_id,
        outcome,
        notes,
        timestamp: new Date().toISOString()
      };
      await publisher.publish(`dispute:events:${dispute.id}`, JSON.stringify(eventPayload));
      publisher.disconnect();

      return reply.send({ success: true, message: `Dispute ${dispute.id} updated to ${finalStatus}` });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message });
    }
  });
};
