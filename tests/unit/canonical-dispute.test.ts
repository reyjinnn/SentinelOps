import { describe, it, expect } from 'vitest';
import { CanonicalDisputeEventSchema } from '../../src/schemas/canonical-dispute';

describe('Canonical Dispute Event Schema Validation', () => {
  const validPayload = {
    event_id: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date().toISOString(),
    tenant_id: '123e4567-e89b-12d3-a456-426614174000',
    marketplace: 'SHOPEE',
    dispute_id: 'DSP-123',
    order: {
      order_id: 'ORD-123',
      total_amount_idr: 50000,
      currency: 'IDR',
      escrow_status: 'HELD_IN_ESCROW'
    },
    customer: {
      user_id: 'USR-123',
      customer_name: 'Budi',
      customer_phone: '08123456789',
      account_age_days: 10,
      historical_return_count: 0,
      historical_order_count: 5
    },
    logistics: {
      courier_code: 'JNT_EXPRESS',
      tracking_number: 'TRK-123',
      hub_inbound_weight_grams: 1000,
      driver_handover_weight_grams: 1000
    },
    evidence: {
      customer_reason: 'Rusak',
      proof_image_urls: ['http://example.com/img.jpg'],
      catalog_weight_grams: 1000,
      sku_reference: 'SKU-1'
    }
  };

  it('should pass validation for a fully valid payload', () => {
    const result = CanonicalDisputeEventSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should fail if event_id is not a valid UUID', () => {
    const invalidPayload = { ...validPayload, event_id: 'not-a-uuid' };
    const result = CanonicalDisputeEventSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should fail if marketplace is not in enum', () => {
    const invalidPayload = { ...validPayload, marketplace: 'UNKNOWN_MARKETPLACE' };
    const result = CanonicalDisputeEventSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should fail if total_amount_idr is negative', () => {
    const invalidPayload = {
      ...validPayload,
      order: { ...validPayload.order, total_amount_idr: -5000 }
    };
    const result = CanonicalDisputeEventSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should fail if catalog_weight_grams is negative or zero', () => {
    const invalidPayload = {
      ...validPayload,
      evidence: { ...validPayload.evidence, catalog_weight_grams: 0 }
    };
    const result = CanonicalDisputeEventSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should set default values for customer historical metrics if omitted', () => {
    const { customer, ...rest } = validPayload;
    const payloadWithoutMetrics = {
      ...rest,
      customer: { user_id: 'USR-123' } // Omitting age, return_count, order_count
    };

    const result = CanonicalDisputeEventSchema.safeParse(payloadWithoutMetrics);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customer.account_age_days).toBe(0);
      expect(result.data.customer.historical_return_count).toBe(0);
      expect(result.data.customer.historical_order_count).toBe(0);
    }
  });
});
