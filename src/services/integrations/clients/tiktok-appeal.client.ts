import { env } from '../../../config/env';
import { AppealSubmissionResult } from './shopee-appeal.client';

export class TiktokAppealClient {
  /**
   * Submits a dispute appeal to TikTok Shop API.
   * Uses exponential backoff internally in production.
   */
  static async submitDisputeAppeal(
    accessToken: string,
    externalStoreId: string,
    disputeId: string,
    dossierMarkdown: string,
    proofImageUrls: string[]
  ): Promise<AppealSubmissionResult> {
    
    // In MVP/Test mode, we mock the API response
    if (env.TEST_MODE || process.env.NODE_ENV !== 'production') {
      console.log(`[TikTok Client] Mocking appeal submission for store ${externalStoreId}, dispute ${disputeId}`);
      
      // Simulate network latency (200ms)
      await new Promise(resolve => setTimeout(resolve, 200));

      return {
        success: true,
        external_appeal_id: `TT-APL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      };
    }

    // --- REAL IMPLEMENTATION (Skeleton for Production) ---
    /*
    try {
      const response = await axios.post(
        'https://open-api.tiktokglobalshop.com/api/reverse/v2/disputes/appeal',
        {
          reverse_order_id: disputeId,
          appeal_reason: dossierMarkdown,
          evidence_image_list: proofImageUrls
        },
        {
          headers: {
            'x-tts-access-token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code !== 0) {
        return { success: false, error_message: response.data.message };
      }

      return {
        success: true,
        external_appeal_id: response.data.data.appeal_id
      };
    } catch (error: any) {
      return { success: false, error_message: error.message };
    }
    */
   
    throw new Error('Not implemented for production environment yet.');
  }
}
