import { db } from '../../db/database';
import { decryptCredentials, encryptCredentials } from '../../utils/security';
import { env } from '../../config/env';

export class TokenManagerService {
  /**
   * Retrieves a valid access token for the given store connection.
   * In a real production scenario, this will check token expiry and automatically 
   * request a new OAuth token using the refresh_token if it is expiring soon (<30m).
   */
  static async getValidAccessToken(storeConnectionId: string): Promise<string> {
    const store = await db.selectFrom('store_connections')
      .where('id', '=', storeConnectionId)
      .selectAll()
      .executeTakeFirst();

    if (!store) {
      throw new Error(`Store connection not found: ${storeConnectionId}`);
    }

    if (!store.is_active) {
      throw new Error(`Store connection is inactive: ${storeConnectionId}`);
    }

    // Decrypt credentials
    const credentialsStr = store.credentials_encrypted;
    if (!credentialsStr) {
      throw new Error(`No credentials found for store: ${storeConnectionId}`);
    }

    try {
      const decryptedData = decryptCredentials(credentialsStr, env.ENCRYPTION_MASTER_KEY);
      const credentials = JSON.parse(decryptedData);

      // --- MOCK AUTO-REFRESH LOGIC ---
      // For demonstration, if we had expiry logic:
      // if (credentials.expires_at && new Date(credentials.expires_at).getTime() < Date.now() + 30 * 60000) {
      //   const newTokens = await refreshOAuthToken(credentials.refresh_token);
      //   const encryptedNewTokens = encryptCredentials(JSON.stringify(newTokens), env.ENCRYPTION_MASTER_KEY);
      //   await db.updateTable('store_connections')
      //     .set({ credentials_encrypted: encryptedNewTokens })
      //     .where('id', '=', storeConnectionId)
      //     .execute();
      //   return newTokens.access_token;
      // }

      return credentials.token || credentials.access_token;
    } catch (error) {
      throw new Error(`Failed to decrypt or parse credentials for store ${storeConnectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
