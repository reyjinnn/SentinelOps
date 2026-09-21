import { describe, it, expect } from 'vitest';
import { DecisionEngineService } from '../../src/services/decision-engine.service';
import { CanonicalDisputeEvent } from '../../src/schemas/canonical-dispute';
import { ForensicAnalysisResult } from '../../src/services/ai/forensic-sensor.service';

function createMockEvent(amount: number, catalogWeight: number, handoverWeight: number): CanonicalDisputeEvent {
  return {
    event_id: '123',
    timestamp: new Date().toISOString(),
    tenant_id: 'tenant-1',
    marketplace: 'SHOPEE',
    dispute_id: 'dsp-1',
    order: {
      order_id: 'ord-1',
      total_amount_idr: amount,
      currency: 'IDR',
      escrow_status: 'HELD_IN_ESCROW',
    },
    customer: {
      user_id: 'usr-1',
      account_age_days: 10,
      historical_return_count: 0,
      historical_order_count: 5,
    },
    logistics: {
      courier_code: 'JNT_EXPRESS',
      tracking_number: 'trk-1',
      hub_inbound_weight_grams: catalogWeight,
      driver_handover_weight_grams: handoverWeight,
    },
    evidence: {
      customer_reason: 'reason',
      proof_image_urls: [],
      catalog_weight_grams: catalogWeight,
      sku_reference: 'sku-1',
    },
  };
}

function createMockAi(risk: number, confidence: number, tamper: boolean = false): ForensicAnalysisResult {
  return {
    visual_tamper_detected: tamper,
    visual_evidence_match_rating: 0.9,
    weight_discrepancy_grams: 0,
    fraud_risk_score: risk,
    confidence_score: confidence,
    anomaly_reasons: [],
    recommended_posture: 'LOW_RISK',
  };
}

describe('Decision Engine Service', () => {
  it('should route to RED_ESCROW_FROZEN if weight deviation is >= 30%', () => {
    const event = createMockEvent(100000, 1000, 700); // 30% deviation
    const ai = createMockAi(10, 0.95);
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('RED_ESCROW_FROZEN');
    expect(result.triggered_rule).toBe('FRAUD_HARD_CONSTRAINT_TRIGGERED');
    expect(result.loss_prevented_idr).toBe(100000);
  });

  it('should route to RED_ESCROW_FROZEN if visual tamper is detected', () => {
    const event = createMockEvent(100000, 1000, 950); // 5% deviation
    const ai = createMockAi(10, 0.95, true); // Tampered
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('RED_ESCROW_FROZEN');
  });

  it('should route to RED_ESCROW_FROZEN if fraud risk score >= 75', () => {
    const event = createMockEvent(100000, 1000, 950);
    const ai = createMockAi(76, 0.95);
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('RED_ESCROW_FROZEN');
  });

  it('should route to YELLOW_ESCALATE_HUMAN if value > 500000 and not RED', () => {
    const event = createMockEvent(600000, 1000, 950);
    const ai = createMockAi(10, 0.95);
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('YELLOW_ESCALATE_HUMAN');
    expect(result.loss_prevented_idr).toBe(0);
  });

  it('should route to YELLOW_ESCALATE_HUMAN if risk score is ambiguous (16-74)', () => {
    const event = createMockEvent(40000, 1000, 950);
    const ai = createMockAi(40, 0.95);
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('YELLOW_ESCALATE_HUMAN');
  });

  it('should route to YELLOW_ESCALATE_HUMAN if AI confidence is low (< 0.80)', () => {
    const event = createMockEvent(40000, 1000, 950);
    const ai = createMockAi(10, 0.70); // Low confidence
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('YELLOW_ESCALATE_HUMAN');
  });

  it('should route to GREEN_AUTO_REFUND if low risk, low value, high confidence', () => {
    const event = createMockEvent(40000, 1000, 950); // <= 50.000, 5% dev
    const ai = createMockAi(5, 0.95); // <= 15 risk, >= 0.90 conf
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('GREEN_AUTO_REFUND');
    expect(result.triggered_rule).toBe('LOW_RISK_FAST_TRACK');
    expect(result.loss_prevented_idr).toBe(0);
  });

  it('should fallback to YELLOW_ESCALATE_HUMAN for safe fallback (value > 50000 but < 500000)', () => {
    const event = createMockEvent(100000, 1000, 950); // 100.000 value
    const ai = createMockAi(10, 0.95);
    const result = DecisionEngineService.evaluate(event, ai);
    expect(result.decision_lane).toBe('YELLOW_ESCALATE_HUMAN');
    expect(result.triggered_rule).toBe('DEFAULT_SAFE_FALLBACK');
  });
});
