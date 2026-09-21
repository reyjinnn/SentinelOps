import { CanonicalDisputeEvent, CanonicalDisputeEventSchema } from '../schemas/canonical-dispute';
import { v4 as uuidv4 } from 'uuid';

export function mapGenericToCanonical(payload: any, tenantId: string): CanonicalDisputeEvent {
  const fullPayload = {
    ...payload,
    tenant_id: tenantId,
    event_id: payload.event_id || uuidv4(),
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  return CanonicalDisputeEventSchema.parse(fullPayload);
}
