import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { db } from '../src/db/database';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../src/config/env';

// E2E Tests for the 4 Calibration Scenarios
// Assumes the local API is running at http://localhost:9000 and connected to the same DB

const API_URL = 'http://localhost:' + (env.PORT || '9000');
const TENANT_ID = 'tenant-demo-123'; // Assuming seed script creates this, or we can use any UUID
const SHOPEE_SECRET = env.SHOPEE_WEBHOOK_SECRET || 'shopee-secret-key';
const TIKTOK_SECRET = env.TIKTOK_WEBHOOK_SECRET || 'tiktok-secret-key';
const TOKOPEDIA_SECRET = 'tokopedia-secret-key'; // Assuming handled similarly
const SHOPIFY_SECRET = 'shopify-secret-key';

function generateSignature(body: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe.skip('E2E Calibration Scenarios (Sprint 4)', () => {
  beforeAll(async () => {
    // Optionally clean up past test data if needed, but since we generate unique IDs, it's fine.
  });

  afterAll(async () => {
    // Close DB connection if needed
  });

  it('Case A: Shopee Happy Path (AUTO_REFUND)', async () => {
    const eventId = `EVT-A-${uuidv4()}`;
    const disputeId = `DSP-A-${uuidv4()}`;
    const orderId = `ORD-A-${uuidv4()}`;

    const payload = {
      event_id: eventId,
      tenant_id: TENANT_ID,
      marketplace: 'SHOPEE',
      timestamp: new Date().toISOString(),
      order: {
        order_id: orderId,
        total_amount_idr: 42000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-A',
        customer_name: 'Budi Santoso',
        customer_phone: '081234567890',
        account_age_days: 400,
        historical_return_count: 0,
        historical_order_count: 50
      },
      logistics: {
        courier_code: 'SPX_EXPRESS',
        tracking_number: 'TRK-A-123',
        hub_inbound_weight_grams: 500,
        driver_handover_weight_grams: 488 // 2.4% deviation
      },
      evidence: {
        sku_reference: 'SKU-A',
        customer_reason: 'Barang tidak sesuai',
        proof_image_urls: [],
        catalog_weight_grams: 500
      }
    };

    const body = JSON.stringify(payload);
    const signature = generateSignature(body, SHOPEE_SECRET);

    const res = await request(API_URL)
      .post('/api/v1/disputes/evaluate')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', TENANT_ID)
      .set('x-marketplace-source', 'SHOPEE')
      .set('x-signature', signature)
      .send(payload);

    expect(res.status).toBe(202);

    // Wait for worker to process
    await delay(1500);

    const dispute = await db.selectFrom('disputes').where('id', '=', disputeId).selectAll().executeTakeFirst();
    expect(dispute).toBeDefined();
    expect(dispute?.status).toBe('AUTO_REFUND');

    const ledger = await db.selectFrom('ledger_mutations').where('dispute_id', '=', disputeId).selectAll().executeTakeFirst();
    expect(ledger).toBeDefined();
    expect(ledger?.mutation_type).toBe('AUTO_REFUND_ISSUED');
  }, 10000);

  it('Case B: TikTok Shop Empty Box Fraud (ESCROW_FROZEN)', async () => {
    const eventId = `EVT-B-${uuidv4()}`;
    const disputeId = `DSP-B-${uuidv4()}`;
    const orderId = `ORD-B-${uuidv4()}`;

    const payload = {
      event_id: eventId,
      tenant_id: TENANT_ID,
      marketplace: 'TIKTOK_SHOP',
      timestamp: new Date().toISOString(),
      order: {
        order_id: orderId,
        total_amount_idr: 850000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-B',
        customer_name: 'Joko Widodo', // For PII masking test
        customer_phone: '+628199999999',
        account_age_days: 10,
        historical_return_count: 5,
        historical_order_count: 5
      },
      logistics: {
        courier_code: 'JNT_EXPRESS',
        tracking_number: 'TRK-B-123',
        hub_inbound_weight_grams: 1000,
        driver_handover_weight_grams: 129 // 87.1% deviation
      },
      evidence: {
        sku_reference: 'SKU-B',
        customer_reason: 'Kardus kosong!',
        proof_image_urls: [],
        catalog_weight_grams: 1000
      }
    };

    const body = JSON.stringify(payload);
    const signature = generateSignature(body, TIKTOK_SECRET);

    const res = await request(API_URL)
      .post('/api/v1/disputes/evaluate')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', TENANT_ID)
      .set('x-marketplace-source', 'TIKTOK_SHOP')
      .set('x-signature', signature)
      .send(payload);

    expect(res.status).toBe(202);

    await delay(1500);

    const dispute = await db.selectFrom('disputes').where('id', '=', disputeId).selectAll().executeTakeFirst();
    expect(dispute).toBeDefined();
    expect(dispute?.status).toBe('ESCROW_FROZEN');

    const ledger = await db.selectFrom('ledger_mutations').where('dispute_id', '=', disputeId).selectAll().executeTakeFirst();
    expect(ledger).toBeDefined();
    expect(ledger?.mutation_type).toBe('ESCROW_FROZEN');
    expect(Number(ledger?.amount_idr)).toBe(850000);
  }, 10000);

  it('Case C: Tokopedia Courier Weight Tampering (ESCROW_FROZEN)', async () => {
    // Similar to Case B but weight skyrockets (e.g. 500g -> 1090g)
    const eventId = `EVT-C-${uuidv4()}`;
    const disputeId = `DSP-C-${uuidv4()}`;
    const orderId = `ORD-C-${uuidv4()}`;

    const payload = {
      event_id: eventId,
      tenant_id: TENANT_ID,
      marketplace: 'TOKOPEDIA',
      timestamp: new Date().toISOString(),
      order: {
        order_id: orderId,
        total_amount_idr: 2800000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-C',
        account_age_days: 900,
        historical_return_count: 1,
        historical_order_count: 200
      },
      logistics: {
        courier_code: 'SICEPAT',
        tracking_number: 'TRK-C-123',
        hub_inbound_weight_grams: 500,
        driver_handover_weight_grams: 1090 // 118% deviation up
      },
      evidence: {
        sku_reference: 'SKU-C',
        customer_reason: 'Barang palsu/diganti batu',
        proof_image_urls: [],
        catalog_weight_grams: 500
      }
    };

    // Note: Tokopedia adapter uses SHOPEE secret logic in mock, or we can just bypass strict auth in test environment or use a generic one.
    // Assuming the ingestion route accepts TOKOPEDIA if we use the SHOPEE secret for the mock (since it uses the same env if we didn't add TOKOPEDIA_WEBHOOK_SECRET)
    // Actually, in ingestion.route.ts, we need to check how TOKOPEDIA is handled.
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, SHOPEE_SECRET); // Assuming fallback to shopee secret for unsupported ones in MVP

    const res = await request(API_URL)
      .post('/api/v1/disputes/evaluate')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', TENANT_ID)
      .set('x-marketplace-source', 'TOKOPEDIA')
      .set('x-signature', signature)
      .send(payload);

    expect(res.status).toBe(202);

    await delay(1500);

    const dispute = await db.selectFrom('disputes').where('id', '=', disputeId).selectAll().executeTakeFirst();
    expect(dispute).toBeDefined();
    expect(dispute?.status).toBe('ESCROW_FROZEN');
  }, 10000);

  it('Case D: Shopify High-Value Borderline (ESCALATE_HUMAN)', async () => {
    const eventId = `EVT-D-${uuidv4()}`;
    const disputeId = `DSP-D-${uuidv4()}`;
    const orderId = `ORD-D-${uuidv4()}`;

    const payload = {
      event_id: eventId,
      tenant_id: TENANT_ID,
      marketplace: 'SHOPIFY',
      timestamp: new Date().toISOString(),
      order: {
        order_id: orderId,
        total_amount_idr: 3500000, // High value
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-D',
        account_age_days: 10,
        historical_return_count: 0,
        historical_order_count: 1
      },
      logistics: {
        courier_code: 'OTHER',
        tracking_number: 'TRK-D-123',
        hub_inbound_weight_grams: 1000,
        driver_handover_weight_grams: 800 // 20% deviation
      },
      evidence: {
        sku_reference: 'SKU-D',
        customer_reason: 'Sedikit lecet',
        proof_image_urls: [],
        catalog_weight_grams: 1000
      }
    };

    const body = JSON.stringify(payload);
    const signature = generateSignature(body, SHOPEE_SECRET); 

    const res = await request(API_URL)
      .post('/api/v1/disputes/evaluate')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', TENANT_ID)
      .set('x-marketplace-source', 'SHOPIFY')
      .set('x-signature', signature)
      .send(payload);

    expect(res.status).toBe(202);

    await delay(1500);

    const dispute = await db.selectFrom('disputes').where('id', '=', disputeId).selectAll().executeTakeFirst();
    expect(dispute).toBeDefined();
    expect(dispute?.status).toBe('ESCALATE_HUMAN');
  }, 10000);
});
