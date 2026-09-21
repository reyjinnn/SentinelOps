import { CanonicalDisputeEvent } from '../schemas/canonical-dispute';
import { v4 as uuidv4 } from 'uuid';

export function mapShopeeToCanonical(payload: any, tenantId: string): CanonicalDisputeEvent {
  return {
    event_id: payload.event_id || uuidv4(),
    timestamp: payload.timestamp || new Date().toISOString(),
    tenant_id: tenantId,
    marketplace: 'SHOPEE',
    dispute_id: payload.return_sn || payload.dispute_id,
    order: {
      order_id: payload.order_sn,
      total_amount_idr: payload.refund_amount,
      currency: 'IDR',
      escrow_status: 'HELD_IN_ESCROW',
    },
    customer: {
      user_id: payload.buyer_user_id || 'unknown',
      account_age_days: payload.buyer_account_age || 0,
      historical_return_count: payload.buyer_historical_returns || 0,
      historical_order_count: payload.buyer_historical_orders || 0,
    },
    logistics: {
      courier_code: 'SPX_EXPRESS',
      tracking_number: payload.tracking_number || 'UNKNOWN',
      hub_inbound_weight_grams: payload.logistics?.hub_weight || 0,
      driver_handover_weight_grams: payload.logistics?.handover_weight || 0,
    },
    evidence: {
      customer_reason: payload.reason || 'No reason provided',
      proof_image_urls: payload.images || [],
      catalog_weight_grams: payload.catalog_weight || 0,
      sku_reference: payload.item_sku || 'UNKNOWN',
    }
  };
}
