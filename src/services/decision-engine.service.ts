import { CanonicalDisputeEvent } from '../schemas/canonical-dispute';
import { ForensicAnalysisResult } from './ai/forensic-sensor.service';

export type DecisionLane = 'GREEN_AUTO_REFUND' | 'RED_ESCROW_FROZEN' | 'YELLOW_ESCALATE_HUMAN';

export interface DecisionResult {
  decision_lane: DecisionLane;
  triggered_rule: string;
  loss_prevented_idr: number;
}

export class DecisionEngineService {
  /**
   * Evaluates the determinisitc matrix rules based on Canonical payload and AI forensics.
   * Hard Rules:
   * - Max daily refund / transaction limits.
   * - RED: Deviasi >= 30% OR Visual Tamper OR Risk >= 75
   * - GREEN: Value <= 50.000 AND Risk <= 15 AND Deviasi <= 10% AND Confidence >= 0.90
   * - YELLOW: Everything else or transactions > 500.000
   */
  static evaluate(event: CanonicalDisputeEvent, aiResult: ForensicAnalysisResult): DecisionResult {
    const value = event.order.total_amount_idr;
    
    // Calculate precise deviations
    const wCatalog = event.evidence.catalog_weight_grams;
    const wHandover = event.logistics.driver_handover_weight_grams;
    const deltaW = Math.abs(wCatalog - wHandover);
    const deviationRatio = wCatalog > 0 ? (deltaW / wCatalog) : 0;

    // RULE 1: RED LANE (Fraud Detection)
    if (deviationRatio >= 0.30 || aiResult.visual_tamper_detected || aiResult.fraud_risk_score >= 75) {
      return {
        decision_lane: 'RED_ESCROW_FROZEN',
        triggered_rule: 'FRAUD_HARD_CONSTRAINT_TRIGGERED',
        loss_prevented_idr: value, // Entire escrow value saved
      };
    }

    // RULE 2: YELLOW LANE (Value Constraint or Ambiguity)
    if (value > 500000 || (aiResult.fraud_risk_score > 15 && aiResult.fraud_risk_score < 75) || aiResult.confidence_score < 0.80) {
      return {
        decision_lane: 'YELLOW_ESCALATE_HUMAN',
        triggered_rule: 'ESCALATION_THRESHOLD_REACHED',
        loss_prevented_idr: 0,
      };
    }

    // RULE 3: GREEN LANE (Low Risk Auto-Refund)
    // Extra hard check: NEVER refund > 200.000 automatically
    if (value <= 50000 && aiResult.fraud_risk_score <= 15 && deviationRatio <= 0.10 && aiResult.confidence_score >= 0.90) {
      return {
        decision_lane: 'GREEN_AUTO_REFUND',
        triggered_rule: 'LOW_RISK_FAST_TRACK',
        loss_prevented_idr: 0, // No loss prevented, refund issued
      };
    }

    // Fallback: If no lane explicitly matched (e.g. value is 100.000 and risk is 10), put to YELLOW to be safe
    return {
      decision_lane: 'YELLOW_ESCALATE_HUMAN',
      triggered_rule: 'DEFAULT_SAFE_FALLBACK',
      loss_prevented_idr: 0,
    };
  }
}
