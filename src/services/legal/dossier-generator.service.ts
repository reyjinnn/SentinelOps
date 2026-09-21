import { CanonicalDisputeEvent } from '../../schemas/canonical-dispute';
import { ForensicAnalysisResult } from '../ai/forensic-sensor.service';
import { DecisionResult } from '../decision-engine.service';
import { ArbitrationStrategy } from './dossier.strategy';
import { ShopeeArbitrationStrategy } from './strategies/shopee.strategy';
import { TikTokArbitrationStrategy } from './strategies/tiktok.strategy';

export class DossierGeneratorService {
  private strategies: ArbitrationStrategy[];

  constructor() {
    this.strategies = [
      new ShopeeArbitrationStrategy(),
      new TikTokArbitrationStrategy(),
      // Add more strategies (e.g., Tokopedia, Shopify) here in the future
    ];
  }

  /**
   * Generates the appropriate dossier by selecting the right strategy for the marketplace.
   */
  generate(event: CanonicalDisputeEvent, aiResult: ForensicAnalysisResult, decision: DecisionResult): string {
    const strategy = this.strategies.find(s => s.supports(event.marketplace));

    if (!strategy) {
      // Fallback Generic Dossier
      return `
# GENERIC DISPUTE DOSSIER
**Order ID:** ${event.order.order_id}
**Status:** ${decision.decision_lane}

**Reason:** No specific legal template found for marketplace ${event.marketplace}.
**Fraud Risk:** ${aiResult.fraud_risk_score}/100
**Discrepancy:** ${aiResult.weight_discrepancy_grams}g
      `.trim();
    }

    return strategy.generateDossier(event, aiResult, decision);
  }
}
