import { describe, it, expect, vi } from 'vitest';
import { DecisionEngineService } from '../src/services/decision-engine.service';
import { ForensicSensorService } from '../src/services/ai/forensic-sensor.service';
import { DossierGeneratorService } from '../src/services/legal/dossier-generator.service';
import { CanonicalDisputeEvent } from '../src/schemas/canonical-dispute';

describe('Sprint 2: Decision Engine & Strategy Pattern', () => {
  const mockEvent: CanonicalDisputeEvent = {
    event_id: 'TEST-123',
    tenant_id: 'tenant-123',
    dispute_id: 'DSP-TEST-123',
    marketplace: 'SHOPEE',
    timestamp: new Date().toISOString(),
    order: {
      order_id: 'SHP-123',
      total_amount_idr: 45000,
      currency: 'IDR',
      escrow_status: 'HELD_IN_ESCROW'
    },
    customer: {
      user_id: 'USR-1',
      account_age_days: 100,
      historical_return_count: 0,
      historical_order_count: 50
    },
    logistics: {
      courier_code: 'SPX_EXPRESS',
      tracking_number: 'TRK-123',
      hub_inbound_weight_grams: 500,
      driver_handover_weight_grams: 500
    },
    evidence: {
      sku_reference: 'SKU-123',
      customer_reason: 'Barang rusak',
      proof_image_urls: [],
      catalog_weight_grams: 500
    }
  };

  it('1. Should return GREEN_AUTO_REFUND for low value, low risk, low deviation', () => {
    const aiResult = {
      visual_tamper_detected: false,
      visual_evidence_match_rating: 0.95,
      weight_discrepancy_grams: 0,
      fraud_risk_score: 5,
      confidence_score: 0.95,
      anomaly_reasons: [],
      recommended_posture: 'LOW_RISK' as const
    };

    const decision = DecisionEngineService.evaluate(mockEvent, aiResult);
    expect(decision.decision_lane).toBe('GREEN_AUTO_REFUND');
    expect(decision.loss_prevented_idr).toBe(0);
  });

  it('2. Should return RED_ESCROW_FROZEN for high weight deviation (>30%)', () => {
    const fraudEvent = { ...mockEvent };
    fraudEvent.evidence.catalog_weight_grams = 1000;
    fraudEvent.logistics.driver_handover_weight_grams = 500; // 50% deviation

    const aiResult = {
      visual_tamper_detected: false,
      visual_evidence_match_rating: 0.5,
      weight_discrepancy_grams: 500,
      fraud_risk_score: 80,
      confidence_score: 0.9,
      anomaly_reasons: ['High weight deviation'],
      recommended_posture: 'HIGH_CERTAINTY_FRAUD' as const
    };

    const decision = DecisionEngineService.evaluate(fraudEvent, aiResult);
    expect(decision.decision_lane).toBe('RED_ESCROW_FROZEN');
    expect(decision.loss_prevented_idr).toBe(45000);
  });

  it('3. Should generate correct Strategy Markdown for SHOPEE RED Lane', () => {
    const aiResult = {
      visual_tamper_detected: true,
      visual_evidence_match_rating: 0.1,
      weight_discrepancy_grams: 300,
      fraud_risk_score: 90,
      confidence_score: 0.99,
      anomaly_reasons: ['Tampered package'],
      recommended_posture: 'HIGH_CERTAINTY_FRAUD' as const
    };

    const decision = {
      decision_lane: 'RED_ESCROW_FROZEN' as const,
      triggered_rule: 'FRAUD_HARD_CONSTRAINT_TRIGGERED',
      loss_prevented_idr: 45000
    };

    const generator = new DossierGeneratorService();
    const md = generator.generate(mockEvent, aiResult, decision);

    expect(md).toContain('BUKTI SANGGAHAN RESMI (DISPUTE DOSSIER)');
    expect(md).toContain('Shopee Indonesia');
    expect(md).toContain('Pasal 8.2');
    expect(md).toContain('RED_ESCROW_FROZEN');
    expect(md).toContain('300 Gram');
    expect(md).toContain('YA'); // Visual tampering detected
  });
});
