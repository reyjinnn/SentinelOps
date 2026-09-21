import { env } from '../../../config/env';
import { AppealSubmissionResult } from './shopee-appeal.client';

export class GenericAppealClient {
  /**
   * Submits a dispute appeal to a generic custom API / Tokopedia.
   */
  static async submitDisputeAppeal(
    webhookUrl: string | undefined, // Decrypted from credentials
    externalStoreId: string,
    disputeId: string,
    dossierMarkdown: string,
    proofImageUrls: string[]
  ): Promise<AppealSubmissionResult> {
    
    // In MVP/Test mode, we mock the API response
    if (env.TEST_MODE || process.env.NODE_ENV !== 'production') {
      console.log(`[Generic Client] Mocking appeal submission for store ${externalStoreId}, dispute ${disputeId}`);
      
      // Simulate network latency (200ms)
      await new Promise(resolve => setTimeout(resolve, 200));

      return {
        success: true,
        external_appeal_id: `GEN-APL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      };
    }

    // --- REAL IMPLEMENTATION (Skeleton for Production) ---
    /*
    if (!webhookUrl) {
      return { success: false, error_message: 'Missing webhook URL for generic client' };
    }

    try {
      const response = await axios.post(
        webhookUrl,
        {
          dispute_id: disputeId,
          markdown_dossier: dossierMarkdown,
          images: proofImageUrls
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        external_appeal_id: response.data.ticket_id || `REQ-${Date.now()}`
      };
    } catch (error: any) {
      return { success: false, error_message: error.message };
    }
    */
   
    throw new Error('Not implemented for production environment yet.');
  }
}
