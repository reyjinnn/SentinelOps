import { z } from 'zod';

export const MarketplaceEnum = z.enum([
  'SHOPEE',
  'TIKTOK_SHOP',
  'TOKOPEDIA',
  'LAZADA',
  'SHOPIFY',
  'CUSTOM_API',
]);

export const CourierCodeEnum = z.enum([
  'SPX_EXPRESS',
  'JNT_EXPRESS',
  'SICEPAT',
  'ANTERAJA',
  'JNE',
  'NINJA_VAN',
  'OTHER',
]);

export const EscrowStatusEnum = z.enum([
  'HELD_IN_ESCROW',
  'RELEASED_TO_SELLER',
  'REFUNDED_TO_BUYER',
  'FROZEN',
]);

export const CanonicalDisputeEventSchema = z.object({
  event_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  tenant_id: z.string().uuid(),
  marketplace: MarketplaceEnum,
  dispute_id: z.string(),
  order: z.object({
    order_id: z.string(),
    total_amount_idr: z.number().nonnegative(),
    currency: z.string().default('IDR'),
    escrow_status: EscrowStatusEnum,
  }),
  customer: z.object({
    user_id: z.string(),
    account_age_days: z.number().int().nonnegative().default(0),
    historical_return_count: z.number().int().nonnegative().default(0),
    historical_order_count: z.number().int().nonnegative().default(0),
  }),
  logistics: z.object({
    courier_code: CourierCodeEnum,
    tracking_number: z.string(),
    hub_inbound_weight_grams: z.number().nonnegative(),
    driver_handover_weight_grams: z.number().nonnegative(),
  }),
  evidence: z.object({
    customer_reason: z.string(),
    proof_image_urls: z.array(z.string().url()).default([]),
    catalog_weight_grams: z.number().positive(),
    sku_reference: z.string(),
  }),
});

export type CanonicalDisputeEvent = z.infer<typeof CanonicalDisputeEventSchema>;
