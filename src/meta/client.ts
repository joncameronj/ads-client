import { createHmac } from 'crypto';
import { getConfig } from '../config.js';
import type { MetaErrorResponse, MetaPagedResponse } from './types.js';

// ── Rate Limit Config ──

const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(exponentialDelay + jitter, RATE_LIMIT_CONFIG.maxDelayMs);
}

function isRateLimitError(errorCode: number | undefined): boolean {
  const rateLimitCodes = [4, 17, 32];
  return errorCode !== undefined && rateLimitCodes.includes(errorCode);
}

// ── App Secret Proof ──

function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

// ── Error Messages ──

const ERROR_SUBCODE_MESSAGES: Record<number, string> = {
  2446511: 'Image could not be downloaded. Check the image URL.',
  2490446: 'Ad creative has issues. Review and fix the creative.',
  1487390: 'Invalid image dimensions. Use an image that meets size requirements.',
  1487301: 'Image file is too large. Use a smaller image.',
  1487303: 'Invalid image format. Use JPG or PNG.',
  1815637: 'Ad account is disabled or restricted.',
  1487220: 'Text contains too many characters. Shorten your ad copy.',
  1487007: "Campaign's test mode duration has ended.",
};

export function getMetaErrorMessage(error: {
  message?: string;
  error_user_title?: string;
  error_user_msg?: string;
  error_code?: number;
  error_subcode?: number;
}): string {
  if (error.error_subcode && ERROR_SUBCODE_MESSAGES[error.error_subcode]) {
    return ERROR_SUBCODE_MESSAGES[error.error_subcode];
  }
  if (error.error_user_title) return error.error_user_title;
  if (error.error_user_msg) {
    if (error.error_user_msg.includes('permission')) return 'Permission denied. Check account permissions.';
    if (error.error_user_msg.includes('budget')) return 'Budget issue. Check campaign budget settings.';
  }
  if (error.message) {
    if (error.message.includes('Invalid parameter')) return 'Invalid ad configuration. Review campaign settings.';
    if (error.message.includes('permission') || error.message.includes('access'))
      return 'Permission denied. Check your system user permissions.';
  }
  return 'An error occurred with Meta API. Check your configuration and try again.';
}

// ── Custom Error Class ──

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: number,
    public readonly errorSubcode?: number,
    public readonly errorUserTitle?: string,
    public readonly errorUserMsg?: string,
    public readonly fbtraceId?: string
  ) {
    super(message);
    this.name = 'MetaApiError';
  }

  toUserMessage(): string {
    return getMetaErrorMessage({
      message: this.message,
      error_user_title: this.errorUserTitle,
      error_user_msg: this.errorUserMsg,
      error_code: this.errorCode,
      error_subcode: this.errorSubcode,
    });
  }
}

// ── Core API Request ──

export async function metaApiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    params?: Record<string, string>;
    body?: Record<string, unknown> | FormData;
    retryAttempt?: number;
  } = {}
): Promise<T> {
  const config = getConfig();
  const { method = 'GET', params = {}, body, retryAttempt = 0 } = options;

  const url = new URL(endpoint, `${config.graphBaseUrl}/`);
  url.searchParams.set('access_token', config.accessToken);
  url.searchParams.set('appsecret_proof', generateAppSecretProof(config.accessToken, config.appSecret));

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const fetchOptions: RequestInit = { method };

  if (body) {
    if (body instanceof FormData) {
      fetchOptions.body = body;
    } else {
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(body);
    }
  }

  // 30-second timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(url.toString(), { ...fetchOptions, signal: controller.signal });
  } catch (networkError) {
    // Strip URL with token from network errors
    throw new MetaApiError(
      `Network error calling Meta API: ${endpoint}`,
      undefined,
      undefined,
      undefined,
      networkError instanceof Error ? networkError.message : 'Network error'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorData: MetaErrorResponse;
    try {
      errorData = (await response.json()) as MetaErrorResponse;
    } catch {
      throw new MetaApiError(`Meta API returned HTTP ${response.status} with non-JSON body`);
    }
    const metaError = errorData.error;

    // Retry on rate limit
    if (isRateLimitError(metaError?.code) && retryAttempt < RATE_LIMIT_CONFIG.maxRetries) {
      const delay = calculateBackoffDelay(retryAttempt);
      await sleep(delay);
      return metaApiRequest<T>(endpoint, { ...options, retryAttempt: retryAttempt + 1 });
    }

    throw new MetaApiError(
      metaError?.message || 'Meta API request failed',
      metaError?.code,
      metaError?.error_subcode,
      metaError?.error_user_title,
      metaError?.error_user_msg,
      metaError?.fbtrace_id
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new MetaApiError('Meta API returned invalid JSON in success response');
  }
}

// ── Pagination Helper ──

export async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string> = {},
  maxPages: number = 10
): Promise<T[]> {
  const allResults: T[] = [];
  let nextUrl: string | undefined;
  let pagesLoaded = 0;

  // First page
  const firstPage = await metaApiRequest<MetaPagedResponse<T>>(endpoint, { params });
  allResults.push(...firstPage.data);
  nextUrl = firstPage.paging?.next;
  pagesLoaded++;

  // Subsequent pages — route through metaApiRequest for auth + rate limiting
  while (nextUrl && pagesLoaded < maxPages) {
    const parsed = new URL(nextUrl);
    const pathAfterVersion = parsed.pathname.replace(/^\/v[\d.]+\//, '');
    const nextParams: Record<string, string> = {};
    for (const [key, value] of parsed.searchParams.entries()) {
      if (key !== 'access_token' && key !== 'appsecret_proof') {
        nextParams[key] = value;
      }
    }
    const page = await metaApiRequest<MetaPagedResponse<T>>(pathAfterVersion, { params: nextParams });
    allResults.push(...page.data);
    nextUrl = page.paging?.next;
    pagesLoaded++;
  }

  return allResults;
}

// ── Account Helper ──

export function getAdAccountId(): string {
  return getConfig().adAccountId;
}

export function getDefaultPageId(): string | undefined {
  return getConfig().pageId;
}

export function getDefaultPixelId(): string | undefined {
  return getConfig().pixelId;
}
