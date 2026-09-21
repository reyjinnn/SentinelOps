import { Generated } from 'kysely';

export type TenantTier = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'OPS_ANALYST' | 'VIEWER';
export type Marketplace = 'SHOPEE' | 'TIKTOK_SHOP' | 'TOKOPEDIA' | 'LAZADA' | 'SHOPIFY' | 'CUSTOM_API';
export type CourierCode = 'SPX_EXPRESS' | 'JNT_EXPRESS' | 'SICEPAT' | 'ANTERAJA' | 'JNE' | 'NINJA_VAN' | 'OTHER';
export type EscrowStatus = 'HELD_IN_ESCROW' | 'RELEASED_TO_SELLER' | 'REFUNDED_TO_BUYER' | 'FROZEN';
export type DisputeStatus = 'INGESTED' | 'EVALUATING' | 'AUTO_REFUND' | 'ESCROW_FROZEN' | 'ESCALATE_HUMAN' | 'APPEAL_SUBMITTED' | 'RESOLVED';

export interface TenantsTable {
  id: Generated<string>;
  name: string;
  slug: string;
  subscription_tier: Generated<TenantTier>;
  daily_refund_ceiling_idr: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StoreConnectionsTable {
  id: Generated<string>;
  tenant_id: string;
  marketplace: Marketplace;
  store_name: string;
  external_store_id: string;
  credentials_encrypted: any;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface OrdersTable {
  id: Generated<string>;
  tenant_id: string;
  store_connection_id: string | null;
  external_order_id: string;
  marketplace: Generated<Marketplace>;
  total_amount_idr: number;
  escrow_status: Generated<EscrowStatus>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DisputesTable {
  id: Generated<string>;
  tenant_id: string;
  order_id: string;
  store_connection_id: string | null;
  dispute_code: string;
  customer_id: string;
  customer_reason: string;
  proof_image_urls: Generated<any>;
  status: Generated<DisputeStatus>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  tenants: TenantsTable;
  store_connections: StoreConnectionsTable;
  orders: OrdersTable;
  disputes: DisputesTable;
}
