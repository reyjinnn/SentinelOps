import { CanonicalDisputeEvent } from '../schemas/canonical-dispute';
import { v4 as uuidv4 } from 'uuid';

export function mapTikTokToCanonical(payload: any, tenantId: string): CanonicalDisputeEvent {
  return {
    event_id: payload.event_id || uuidv4(),
    timestamp: payload.create_time ? new Date(payload.create_time * 1000).toISOString() : new Date().toISOString(),
    tenant_id: tenantId,
    marketplace: 'TIKTOK_SHOP',
    dispute_id: payload.reverse_order_id,
    order: {
      order_id: payload.order_id,
      total_amount_idr: payload.refund_total,
      currency: 'IDR',
      escrow_status: 'HELD_IN_ESCROW',
    },
    customer: {
      user_id: payload.buyer_id || 'unknown',
      account_age_days: payload.buyer_metrics?.account_age || 0,
      historical_return_count: payload.buyer_metrics?.return_count || 0,
      historical_order_count: payload.buyer_metrics?.order_count || 0,
    },
    logistics: {
      courier_code: 'JNT_EXPRESS',
      tracking_number: payload.tracking_no || 'UNKNOWN',
      hub_inbound_weight_grams: payload.logistics_info?.hub_inbound_weight || 0,
      driver_handover_weight_grams: payload.logistics_info?.driver_handover_weight || 0,
    },
    evidence: {
      customer_reason: payload.return_reason || 'No reason provided',
      proof_image_urls: payload.evidence_images || [],
      catalog_weight_grams: payload.product_info?.catalog_weight || 0,
      sku_reference: payload.product_info?.seller_sku || 'UNKNOWN',
    }
  };
}
