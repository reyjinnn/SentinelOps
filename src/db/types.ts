import { Generated } from 'kysely';

export type TenantTier = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'OPS_ANALYST' | 'VIEWER';
export type Marketplace = 'SHOPEE' | 'TIKTOK_SHOP' | 'TOKOPEDIA' | 'LAZADA' | 'SHOPIFY' | 'CUSTOM_API';
export type CourierCode = 'SPX_EXPRESS' | 'JNT_EXPRESS' | 'SICEPAT' | 'ANTERAJA' | 'JNE' | 'NINJA_VAN' | 'OTHER';
export type EscrowStatus = 'HELD_IN_ESCROW' | 'RELEASED_TO_SELLER' | 'REFUNDED_TO_BUYER' | 'FROZEN';
export type DisputeStatus = 'INGESTED' | 'EVALUATING' | 'AUTO_REFUND' | 'ESCROW_FROZEN' | 'ESCALATE_HUMAN' | 'APPEAL_SUBMITTED' | 'RESOLVED';

export type RecommendedPosture = 'LOW_RISK' | 'SUSPICIOUS' | 'HIGH_CERTAINTY_FRAUD';
export type DecisionLane = 'GREEN_AUTO_REFUND' | 'RED_ESCROW_FROZEN' | 'YELLOW_ESCALATE_HUMAN';
export type MutationType = 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'AUTO_REFUND_ISSUED' | 'MANUAL_ADJUSTMENT';

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

export interface LogisticsTelemetriesTable {
  id: Generated<string>;
  dispute_id: string;
  courier_code: Generated<CourierCode>;
  tracking_number: string;
  hub_inbound_weight_grams: number;
  driver_handover_weight_grams: number;
  delta_weight_grams: number;
  deviation_ratio: number;
  recorded_at: Generated<Date>;
}

export interface ForensicAuditsTable {
  id: Generated<string>;
  dispute_id: string;
  visual_tamper_detected: Generated<boolean>;
  visual_evidence_match_rating: number;
  fraud_risk_score: number;
  confidence_score: number;
  recommended_posture: RecommendedPosture;
  anomaly_reasons: Generated<any>; // JSONB
  raw_model_response: any | null; // JSONB
  evaluated_at: Generated<Date>;
}

export interface DecisionLogsTable {
  id: Generated<string>;
  dispute_id: string;
  decision_lane: DecisionLane;
  triggered_rule: string;
  loss_prevented_idr: Generated<number>;
  is_human_overridden: Generated<boolean>;
  override_by: string | null;
  override_reason: string | null;
  decided_at: Generated<Date>;
}

export interface DisputeDossiersTable {
  id: Generated<string>;
  dispute_id: string;
  dossier_number: string;
  marketplace_policy_applied: string;
  markdown_content: string;
  pdf_storage_url: string | null;
  generated_at: Generated<Date>;
}

export interface LedgerMutationsTable {
  id: Generated<string>;
  tenant_id: string;
  dispute_id: string;
  amount_idr: number;
  mutation_type: MutationType;
  balance_state_before: string;
  balance_state_after: string;
  created_at: Generated<Date>;
}

export interface Database {
  tenants: TenantsTable;
  store_connections: StoreConnectionsTable;
  orders: OrdersTable;
  disputes: DisputesTable;
  logistics_telemetries: LogisticsTelemetriesTable;
  forensic_audits: ForensicAuditsTable;
  decision_logs: DecisionLogsTable;
  dispute_dossiers: DisputeDossiersTable;
  ledger_mutations: LedgerMutationsTable;
}
