export const mockScenarios = [
  {
    id: 'case-a',
    label: 'Case A: Shopee (Valid Return, Green Lane)',
    payload: JSON.stringify({
      event_id: 'DSP-882190',
      tenant_id: 'tenant-123',
      marketplace: 'SHOPEE',
      timestamp: new Date().toISOString(),
      order: {
        order_id: 'ORD-2026-SHP-09112',
        total_amount_idr: 42000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-891',
        account_age_days: 300,
        historical_return_count: 0,
        historical_order_count: 50
      },
      logistics: {
        courier_code: 'SPX_EXPRESS',
        tracking_number: 'SPXID0299182371',
        hub_inbound_weight_grams: 500,
        driver_handover_weight_grams: 500
      },
      evidence: {
        sku_reference: 'KB-MECH-RGB-01',
        customer_reason: 'Keyboard switch patah',
        proof_image_urls: ['https://dummy.com/img1.jpg'],
        catalog_weight_grams: 500
      }
    }, null, 2)
  },
  {
    id: 'case-b',
    label: 'Case B: TikTok Shop (Empty Box Fraud, Red Lane)',
    payload: JSON.stringify({
      event_id: 'DSP-TT-441209',
      tenant_id: 'tenant-123',
      marketplace: 'TIKTOK_SHOP',
      timestamp: new Date().toISOString(),
      order: {
        order_id: 'ORD-2026-TTS-55210',
        total_amount_idr: 850000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-109',
        account_age_days: 15,
        historical_return_count: 3,
        historical_order_count: 4
      },
      logistics: {
        courier_code: 'JNT_EXPRESS',
        tracking_number: 'JX9920194821',
        hub_inbound_weight_grams: 100, // Box was shipped nearly empty (empty box fraud)
        driver_handover_weight_grams: 100
      },
      evidence: {
        sku_reference: 'EARBUDS-ANC-PRO',
        customer_reason: 'Barang tidak sesuai pesanan, dikirim kotak kosong',
        proof_image_urls: ['https://dummy.com/img2.jpg'],
        catalog_weight_grams: 600
      }
    }, null, 2)
  },
  {
    id: 'case-c',
    label: 'Case C: Tokopedia (Weight Tampering, Red Lane)',
    payload: JSON.stringify({
      event_id: 'DSP-TKP-110293',
      tenant_id: 'tenant-123',
      marketplace: 'TOKOPEDIA',
      timestamp: new Date().toISOString(),
      order: {
        order_id: 'INV/20260921/TKP/88123',
        total_amount_idr: 2800000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-291',
        account_age_days: 400,
        historical_return_count: 1,
        historical_order_count: 120
      },
      logistics: {
        courier_code: 'SICEPAT',
        tracking_number: '00429102910',
        hub_inbound_weight_grams: 2500, 
        driver_handover_weight_grams: 1200 // Weight changed significantly during transit
      },
      evidence: {
        sku_reference: 'SMARTPHONE-5G-128GB',
        customer_reason: 'Isi paket ditukar dengan batu pemberat',
        proof_image_urls: ['https://dummy.com/img3.jpg'],
        catalog_weight_grams: 2500
      }
    }, null, 2)
  },
  {
    id: 'case-d',
    label: 'Case D: Shopify (High-Value Borderline, Yellow Lane)',
    payload: JSON.stringify({
      event_id: 'DSP-SPF-330192',
      tenant_id: 'tenant-123',
      marketplace: 'SHOPIFY',
      timestamp: new Date().toISOString(),
      order: {
        order_id: '#D2C-9912',
        total_amount_idr: 3500000,
        currency: 'IDR',
        escrow_status: 'HELD_IN_ESCROW'
      },
      customer: {
        user_id: 'USR-551',
        account_age_days: 60,
        historical_return_count: 0,
        historical_order_count: 5
      },
      logistics: {
        courier_code: 'NINJA_VAN',
        tracking_number: 'SOC-992019',
        hub_inbound_weight_grams: 1500, 
        driver_handover_weight_grams: 1480 
      },
      evidence: {
        sku_reference: 'DESIGNER-JACKET-BLK',
        customer_reason: 'Jahitan sedikit lepas di bagian lengan',
        proof_image_urls: ['https://dummy.com/img4.jpg'],
        catalog_weight_grams: 1500
      }
    }, null, 2)
  }
];
