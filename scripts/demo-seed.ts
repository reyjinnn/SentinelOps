import { db } from '../src/db/database';
import fs from 'fs';
import path from 'path';
import { encryptCredentials } from '../src/utils/security';
import { env } from '../src/config/env';
import { sql } from 'kysely';

async function seed() {
  console.log('🌱 Starting SentinelOps Demo Seeder...');

  const dbSqlPath = path.join(__dirname, '../db.sql');
  if (fs.existsSync(dbSqlPath)) {
    console.log('📜 Executing db.sql DDL...');
    const ddl = fs.readFileSync(dbSqlPath, 'utf8');
    try {
      await sql.raw(ddl).execute(db);
      console.log('✅ DDL executed successfully.');
    } catch (e: any) {
      console.warn('⚠️ DDL execution skipped or failed (tables might already exist):', e.message);
    }
  }

  const tenantId = 'tenant-demo-123';
  try {
    console.log('🏢 Upserting Demo Tenant...');
    await db.insertInto('tenants')
      .values({
        id: tenantId,
        name: 'PT Mega Elektronik Indonesia',
        slug: 'mega-elektronik',
        subscription_tier: 'ENTERPRISE',
        daily_refund_ceiling_idr: 50000000.00
      })
      .onConflict((oc) => oc.column('id').doUpdateSet({
        name: 'PT Mega Elektronik Indonesia'
      }))
      .execute();

    console.log('🔗 Setting up Store Connections...');
    
    const shopeeKey = encryptCredentials('shopee-api-key-secret-123', env.ENCRYPTION_MASTER_KEY);
    const tiktokKey = encryptCredentials('tiktok-api-key-secret-456', env.ENCRYPTION_MASTER_KEY);

    await db.insertInto('store_connections')
      .values([
        {
          id: 'conn-shopee-1',
          tenant_id: tenantId,
          marketplace: 'SHOPEE',
          store_name: 'Mega Elektronik Official Shopee',
          external_store_id: 'shopee-mega-123',
          credentials_encrypted: shopeeKey,
          is_active: true
        },
        {
          id: 'conn-tiktok-1',
          tenant_id: tenantId,
          marketplace: 'TIKTOK_SHOP',
          store_name: 'Mega Elektronik TikTok Live',
          external_store_id: 'tiktok-mega-456',
          credentials_encrypted: tiktokKey,
          is_active: true
        }
      ])
      .onConflict((oc) => oc.column('id').doUpdateSet({ is_active: true }))
      .execute();
      
    console.log('✅ Store connections inserted successfully.');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    // Close DB connection
    await db.destroy();
    console.log('🏁 Seeding finished.');
  }
}

seed();
