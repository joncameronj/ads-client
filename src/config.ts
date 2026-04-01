import { config } from 'dotenv';
import { z } from 'zod';
import { getActiveClient } from './lib/client-manager.js';

config();

// ── Env var schema (fallback when no clients.json exists) ──

const envSchema = z.object({
  META_ACCESS_TOKEN: z.string().min(1),
  META_AD_ACCOUNT_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_PAGE_ID: z.string().optional(),
  META_PIXEL_ID: z.string().optional(),
  META_API_VERSION: z.string().default('v24.0'),
});

export type AppConfig = {
  accessToken: string;
  adAccountId: string;
  appSecret: string;
  pageId?: string;
  pixelId?: string;
  apiVersion: string;
  graphBaseUrl: string;
};

function fromEnv(): AppConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      'No active client account configured and no environment variables set.\n' +
      'Use add_account to add a client, or set META_ACCESS_TOKEN / META_AD_ACCOUNT_ID / META_APP_SECRET in your environment.'
    );
  }
  const cfg = result.data;
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
  };
}

// ── Main export ──
// Called lazily on every request — always returns the current active client.

export function getConfig(): AppConfig {
  const activeClient = getActiveClient();
  if (activeClient) {
    return {
      ...activeClient,
      graphBaseUrl: `https://graph.facebook.com/${activeClient.apiVersion}`,
    };
  }
  return fromEnv();
}
