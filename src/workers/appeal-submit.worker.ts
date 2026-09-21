import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../db/database';
import { env } from '../config/env';
import { TokenManagerService } from '../services/integrations/token-manager.service';
import { ShopeeAppealClient } from '../services/integrations/clients/shopee-appeal.client';
import { TiktokAppealClient } from '../services/integrations/clients/tiktok-appeal.client';
import { GenericAppealClient } from '../services/integrations/clients/generic-appeal.client';

export interface AppealSubmissionJob {
  disputeId: string;
}

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const appealSubmissionQueue = new Queue<AppealSubmissionJob>('appeal-submission-queue', { 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const startAppealSubmitWorker = () => {
  const worker = new Worker<AppealSubmissionJob>(
    'appeal-submission-queue',
    async (job: Job<AppealSubmissionJob>) => {
      const { disputeId } = job.data;
      console.log(`[Appeal Worker] Processing dispute ${disputeId}`);

      // 1. Fetch Dispute & Dossier
      const dispute = await db.selectFrom('disputes')
        .where('id', '=', disputeId)
        .selectAll()
        .executeTakeFirst();

      if (!dispute) throw new Error('Dispute not found');
      if (!dispute.store_connection_id) throw new Error('Dispute has no store connection');

      const dossier = await db.selectFrom('dispute_dossiers')
        .where('dispute_id', '=', disputeId)
        .selectAll()
        .executeTakeFirst();

      if (!dossier) throw new Error('Dispute Dossier not generated yet');

      // 2. Idempotency Check
      if (dossier.external_appeal_id) {
        console.log(`[Appeal Worker] Appeal already submitted for dispute ${disputeId}. External ID: ${dossier.external_appeal_id}. Skipping.`);
        return;
      }

      // 3. Fetch Store Connection & Credentials
      const storeConnection = await db.selectFrom('store_connections')
        .where('id', '=', dispute.store_connection_id)
        .selectAll()
        .executeTakeFirst();

      if (!storeConnection) throw new Error('Store connection not found');

      const accessToken = await TokenManagerService.getValidAccessToken(storeConnection.id);

      // 4. Submit to Appropriate Marketplace API
      let appealResult;
      
      switch (storeConnection.marketplace) {
        case 'SHOPEE':
          appealResult = await ShopeeAppealClient.submitDisputeAppeal(
            accessToken,
            storeConnection.external_store_id,
            dispute.dispute_code,
            dossier.markdown_content,
            dispute.proof_image_urls as string[]
          );
          break;
        case 'TIKTOK_SHOP':
          appealResult = await TiktokAppealClient.submitDisputeAppeal(
            accessToken,
            storeConnection.external_store_id,
            dispute.dispute_code,
            dossier.markdown_content,
            dispute.proof_image_urls as string[]
          );
          break;
        default:
          appealResult = await GenericAppealClient.submitDisputeAppeal(
            accessToken, // Using token as generic webhook URL for now
            storeConnection.external_store_id,
            dispute.dispute_code,
            dossier.markdown_content,
            dispute.proof_image_urls as string[]
          );
      }

      if (!appealResult.success) {
        throw new Error(`Appeal submission failed: ${appealResult.error_message}`);
      }

      // 5. Update Database
      await db.transaction().execute(async (trx) => {
        await trx.updateTable('dispute_dossiers')
          .set({
            submitted_at: new Date(),
            external_appeal_id: appealResult.external_appeal_id
          })
          .where('id', '=', dossier.id)
          .execute();

        await trx.updateTable('disputes')
          .set({ status: 'APPEAL_SUBMITTED' })
          .where('id', '=', dispute.id)
          .execute();
      });

      console.log(`[Appeal Worker] Successfully submitted appeal for ${disputeId}. External ID: ${appealResult.external_appeal_id}`);

      // 6. Broadcast SSE Event to Cockpit
      const publisher = new IORedis(env.REDIS_URL);
      const eventPayload = {
        type: 'APPEAL_SUBMITTED_SUCCESS',
        dispute_id: disputeId,
        external_appeal_id: appealResult.external_appeal_id,
        timestamp: new Date().toISOString()
      };
      await publisher.publish(`dispute:events:${disputeId}`, JSON.stringify(eventPayload));
      publisher.disconnect();
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Appeal Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
};
