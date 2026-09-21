import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { CanonicalDisputeEvent } from '../schemas/canonical-dispute';

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const disputeQueue = new Queue('dispute-evaluation-queue', { connection });

export async function enqueueDisputeEvent(event: CanonicalDisputeEvent): Promise<{ success: boolean, status: string }> {
  const idempotencyKey = `idempotency:evt:${event.event_id}`;
  
  const acquired = await connection.set(idempotencyKey, 'LOCKED', 'EX', 60 * 60 * 24, 'NX');
  
  if (!acquired) {
    return { success: true, status: 'ALREADY_ENQUEUED' };
  }

  await disputeQueue.add('evaluate', event, {
    jobId: event.event_id,
  });

  return { success: true, status: 'QUEUED' };
}
