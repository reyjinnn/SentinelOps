import { CanonicalDisputeEvent } from '../../schemas/canonical-dispute';
import { ForensicAnalysisResult } from '../ai/forensic-sensor.service';
import { DecisionResult } from '../decision-engine.service';

export interface ArbitrationStrategy {
  /**
   * Identifies if this strategy applies to the given marketplace.
   */
  supports(marketplace: string): boolean;

  /**
   * Generates a legally compliant markdown dossier based on the marketplace's specific terms of service.
   */
  generateDossier(event: CanonicalDisputeEvent, aiResult: ForensicAnalysisResult, decision: DecisionResult): string;
}
