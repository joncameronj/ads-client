import { config } from 'dotenv';
import { z } from 'zod';

config();

const configSchema = z.object({
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN is required'),
  META_AD_ACCOUNT_ID: z.string().min(1, 'META_AD_ACCOUNT_ID is required'),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  META_PAGE_ID: z.string().optional(),
  META_PIXEL_ID: z.string().optional(),
  META_API_VERSION: z.string().default('v24.0'),
});

function loadConfig() {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(i => `  - ${i.path}: ${i.message}`).join('\n');
    throw new Error(`Missing required environment variables:\n${errors}`);
  }

  const cfg = result.data;

  // Normalize ad account ID to include act_ prefix
  const adAccountId = cfg.META_AD_ACCOUNT_ID.startsWith('act_')
    ? cfg.META_AD_ACCOUNT_ID
    : `act_${cfg.META_AD_ACCOUNT_ID}`;

  return {
    accessToken: cfg.META_ACCESS_TOKEN,
    adAccountId,
    appSecret: cfg.META_APP_SECRET,
    pageId: cfg.META_PAGE_ID,
    pixelId: cfg.META_PIXEL_ID,
    apiVersion: cfg.META_API_VERSION,
    graphBaseUrl: `https://graph.facebook.com/${cfg.META_API_VERSION}`,
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}
