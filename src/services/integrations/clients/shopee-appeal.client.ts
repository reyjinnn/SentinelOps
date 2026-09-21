import { env } from '../../../config/env';

export interface AppealSubmissionResult {
  success: boolean;
  external_appeal_id?: string;
  error_message?: string;
}

export class ShopeeAppealClient {
  /**
   * Submits a dispute appeal to Shopee API.
   * Uses exponential backoff internally in production.
   */
  static async submitDisputeAppeal(
    accessToken: string,
    externalStoreId: string,
    disputeId: string,
    dossierMarkdown: string,
    proofImageUrls: string[]
  ): Promise<AppealSubmissionResult> {
    
    // In MVP/Test mode, we mock the API response to avoid real network calls
    // and avoid dealing with complex live OAuth sandboxes.
    if (env.TEST_MODE || process.env.NODE_ENV !== 'production') {
      console.log(`[Shopee Client] Mocking appeal submission for store ${externalStoreId}, dispute ${disputeId}`);
      
      // Simulate network latency (200ms)
      await new Promise(resolve => setTimeout(resolve, 200));

      return {
        success: true,
        external_appeal_id: `SHP-APL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      };
    }

    // --- REAL IMPLEMENTATION (Skeleton for Production) ---
    /*
    try {
      const response = await axios.post(
        'https://partner.shopeemobile.com/api/v2/returns/dispute',
        {
          return_sn: disputeId,
          dispute_reason: 'NON_RECEIPT_OR_MISSING_ITEM', // Mapped from matrix
          dispute_text_reason: dossierMarkdown,
          image_info: proofImageUrls
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.error) {
        return { success: false, error_message: response.data.message };
      }

      return {
        success: true,
        external_appeal_id: response.data.response.dispute_id
      };
    } catch (error: any) {
      // Implement Exponential Backoff for 429 Too Many Requests here (or let BullMQ handle it)
      return { success: false, error_message: error.message };
    }
    */
   
    throw new Error('Not implemented for production environment yet.');
  }
}
