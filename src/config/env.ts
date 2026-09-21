import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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
