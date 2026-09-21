import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { CanonicalDisputeEvent } from '../schemas/canonical-dispute';
import { ForensicSensorService } from '../services/ai/forensic-sensor.service';
import { DecisionEngineService } from '../services/decision-engine.service';
import { DossierGeneratorService } from '../services/legal/dossier-generator.service';
import { db } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const dossierGenerator = new DossierGeneratorService();

export function startDisputeWorker() {
  const worker = new Worker('dispute-evaluation-queue', async (job: Job<CanonicalDisputeEvent>) => {
    const event = job.data;
    console.log(`[Worker] Starting evaluation for event: ${event.event_id}`);

    try {
      // 1. AI Forensic Sensor Evaluation
      const aiResult = await ForensicSensorService.evaluateEvidence(event);
      console.log(`[Worker] AI Evaluation complete. Fraud Risk: ${aiResult.fraud_risk_score}`);

      // 2. Deterministic Decision Engine
      const decision = DecisionEngineService.evaluate(event, aiResult);
      console.log(`[Worker] Decision reached: ${decision.decision_lane}`);

      let dossierContent = '';
      let dossierNumber = `DOSSIER-${event.order.order_id.substring(0, 8).toUpperCase()}`;

      // 3. Generate Legal Dossier if not Auto-Refund
      if (decision.decision_lane !== 'GREEN_AUTO_REFUND') {
        dossierContent = dossierGenerator.generate(event, aiResult, decision);
      }

      // 4. Database Persistence (Transaction)
      await db.transaction().execute(async (trx) => {
        
        // Upsert Order (simplified for Sprint 2 to ensure FK exists)
        const orderId = uuidv4();
        await trx.insertInto('orders')
          .values({
            id: orderId,
            tenant_id: event.tenant_id,
            external_order_id: event.order.order_id,
            marketplace: event.marketplace,
            total_amount_idr: event.order.total_amount_idr,
            escrow_status: decision.decision_lane === 'RED_ESCROW_FROZEN' ? 'FROZEN' : 'HELD_IN_ESCROW'
          })
          .onConflict((oc) => oc.columns(['tenant_id', 'marketplace', 'external_order_id']).doUpdateSet({
            escrow_status: decision.decision_lane === 'RED_ESCROW_FROZEN' ? 'FROZEN' : 'HELD_IN_ESCROW'
          }))
          .execute();

        // Get the real internal order ID
        const orderRecord = await trx.selectFrom('orders')
          .where('tenant_id', '=', event.tenant_id)
          .where('external_order_id', '=', event.order.order_id)
          .select('id')
          .executeTakeFirstOrThrow();

        // Insert Dispute
        const disputeId = uuidv4();
        let disputeStatus: any = 'EVALUATING';
        if (decision.decision_lane === 'GREEN_AUTO_REFUND') disputeStatus = 'AUTO_REFUND';
        if (decision.decision_lane === 'RED_ESCROW_FROZEN') disputeStatus = 'ESCROW_FROZEN';
        if (decision.decision_lane === 'YELLOW_ESCALATE_HUMAN') disputeStatus = 'ESCALATE_HUMAN';

        await trx.insertInto('disputes')
          .values({
            id: disputeId,
            tenant_id: event.tenant_id,
            order_id: orderRecord.id,
            dispute_code: `DSP-${event.event_id.split('-')[0].toUpperCase()}`,
            customer_id: event.customer.user_id,
            customer_reason: event.evidence.customer_reason,
            status: disputeStatus
          })
          .onConflict((oc) => oc.column('dispute_code').doNothing())
          .execute();

        // Retrieve inserted dispute ID in case it already existed
        const disputeRecord = await trx.selectFrom('disputes')
          .where('dispute_code', '=', `DSP-${event.event_id.split('-')[0].toUpperCase()}`)
          .select('id')
          .executeTakeFirstOrThrow();

        // Insert Telemetry
        const deltaW = Math.abs(event.evidence.catalog_weight_grams - event.logistics.driver_handover_weight_grams);
        const deviationRatio = event.evidence.catalog_weight_grams > 0 ? (deltaW / event.evidence.catalog_weight_grams) : 0;
        await trx.insertInto('logistics_telemetries')
          .values({
            dispute_id: disputeRecord.id,
            tracking_number: event.logistics.tracking_number,
            hub_inbound_weight_grams: event.logistics.hub_inbound_weight_grams,
            driver_handover_weight_grams: event.logistics.driver_handover_weight_grams,
            delta_weight_grams: deltaW,
            deviation_ratio: deviationRatio
          })
          .onConflict((oc) => oc.column('dispute_id').doNothing())
          .execute();

        // Insert AI Audit
        await trx.insertInto('forensic_audits')
          .values({
            dispute_id: disputeRecord.id,
            visual_tamper_detected: aiResult.visual_tamper_detected,
            visual_evidence_match_rating: aiResult.visual_evidence_match_rating,
            fraud_risk_score: aiResult.fraud_risk_score,
            confidence_score: aiResult.confidence_score,
            recommended_posture: aiResult.recommended_posture,
            anomaly_reasons: JSON.stringify(aiResult.anomaly_reasons)
          })
          .onConflict((oc) => oc.column('dispute_id').doNothing())
          .execute();

        // Insert Decision Log
        await trx.insertInto('decision_logs')
          .values({
            dispute_id: disputeRecord.id,
            decision_lane: decision.decision_lane,
            triggered_rule: decision.triggered_rule,
            loss_prevented_idr: decision.loss_prevented_idr
          })
          .onConflict((oc) => oc.column('dispute_id').doNothing())
          .execute();

        // Insert Dossier if RED/YELLOW
        if (dossierContent) {
          await trx.insertInto('dispute_dossiers')
            .values({
              dispute_id: disputeRecord.id,
              dossier_number: dossierNumber,
              marketplace_policy_applied: event.marketplace,
              markdown_content: dossierContent
            })
            .onConflict((oc) => oc.column('dispute_id').doNothing())
            .execute();
        }

        // Ledger Mutation for AUTO_REFUND
        if (decision.decision_lane === 'GREEN_AUTO_REFUND') {
          await trx.insertInto('ledger_mutations')
            .values({
              tenant_id: event.tenant_id,
              dispute_id: disputeRecord.id,
              amount_idr: event.order.total_amount_idr,
              mutation_type: 'AUTO_REFUND_ISSUED',
              balance_state_before: 'HELD_IN_ESCROW',
              balance_state_after: 'REFUNDED_TO_BUYER'
            })
            .execute();
        }

      });

      console.log(`[Worker] Evaluation successfully saved for event: ${event.event_id}`);

    } catch (error) {
      console.error(`[Worker] Failed to process event ${event.event_id}:`, error);
      throw error; // Will be retried by BullMQ
    }
  }, { connection });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
