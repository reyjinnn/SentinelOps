import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.VITEST === 'true' || process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (isTestEnv) {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.SHOPEE_WEBHOOK_SECRET = process.env.SHOPEE_WEBHOOK_SECRET || 'mock_secret';
  process.env.TIKTOK_WEBHOOK_SECRET = process.env.TIKTOK_WEBHOOK_SECRET || 'mock_secret';
  process.env.TEST_MODE = process.env.TEST_MODE || 'true';
}
const envSchema = z.object({
  PORT: z.string().default('9000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  SHOPEE_WEBHOOK_SECRET: z.string(),
  TIKTOK_WEBHOOK_SECRET: z.string(),
  TEST_MODE: z.coerce.boolean().default(false),
  ENCRYPTION_MASTER_KEY: z.string().length(32).default('12345678901234567890123456789012'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
