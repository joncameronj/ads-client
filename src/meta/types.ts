// ── Meta API Response Types ──

export interface MetaError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

export interface MetaErrorResponse {
  error: MetaError;
}

export interface MetaPaging {
  cursors?: {
    before: string;
    after: string;
  };
  next?: string;
  previous?: string;
}

export interface MetaPagedResponse<T> {
  data: T[];
  paging?: MetaPaging;
}

// ── Campaign Types ──

export interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  created_time: string;
  updated_time: string;
  start_time?: string;
  stop_time?: string;
  special_ad_categories: string[];
  buying_type: string;
}

// ── Ad Set Types ──

export interface MetaAdSet {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  optimization_goal: string;
  billing_event: string;
  bid_strategy?: string;
  bid_amount?: number;
  targeting: MetaTargeting;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
}

export interface MetaTargeting {
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string; name: string }>;
    cities?: Array<{ key: string; name: string; radius?: number }>;
  };
  age_min?: number;
  age_max?: number;
  genders?: number[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  messenger_positions?: string[];
  device_platforms?: string[];
  flexible_spec?: Array<{
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
    demographics?: Array<{ id: string; name: string }>;
  }>;
  exclusions?: {
    interests?: Array<{ id: string; name: string }>;
    custom_audiences?: Array<{ id: string; name: string }>;
  };
  custom_audiences?: Array<{ id: string; name: string }>;
}

// ── Ad Types ──

export interface MetaAd {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  adset_id: string;
  campaign_id: string;
  creative: { id: string };
  created_time: string;
  updated_time: string;
}

export interface MetaAdCreative {
  id: string;
  name?: string;
  title?: string;
  body?: string;
  effective_object_story_id?: string;
  object_story_spec?: {
    page_id: string;
    link_data?: {
      message?: string;
      link?: string;
      name?: string;
      description?: string;
      caption?: string;
      call_to_action?: {
        type: string;
        value?: { link?: string };
      };
      image_hash?: string;
      picture?: string;
    };
    video_data?: {
      video_id?: string;
      message?: string;
      title?: string;
      link_description?: string;
      call_to_action?: {
        type: string;
        value?: { link?: string };
      };
      image_url?: string;
    };
  };
  thumbnail_url?: string;
  image_url?: string;
  asset_feed_spec?: {
    bodies?: Array<{ text: string }>;
    titles?: Array<{ text: string }>;
    descriptions?: Array<{ text: string }>;
    images?: Array<{ hash: string; url?: string }>;
    videos?: Array<{ video_id: string; thumbnail_url?: string }>;
    call_to_action_types?: string[];
    link_urls?: Array<{ website_url: string }>;
  };
}

// ── Insights Types ──

export interface MetaInsights {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  cpp?: string;
  frequency?: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
  action_values?: MetaAction[];
  outbound_clicks?: MetaAction[];
  unique_outbound_clicks?: MetaAction[];
  cost_per_outbound_click?: MetaAction[];
  cost_per_unique_outbound_click?: MetaAction[];
  video_p25_watched_actions?: MetaAction[];
  video_p50_watched_actions?: MetaAction[];
  video_p75_watched_actions?: MetaAction[];
  video_p100_watched_actions?: MetaAction[];
  date_start: string;
  date_stop: string;
  // Breakdown fields
  age?: string;
  gender?: string;
  publisher_platform?: string;
  platform_position?: string;
  device_platform?: string;
  country?: string;
}

export interface MetaAction {
  action_type: string;
  value: string;
}

// ── Image Upload Types ──

export interface MetaImageUploadResponse {
  images: {
    [filename: string]: {
      hash: string;
      url: string;
      url_128?: string;
    };
  };
}

// ── Video Upload Types ──

export interface MetaVideoUploadStartResponse {
  upload_session_id: string;
  video_id: string;
  start_offset: string;
  end_offset: string;
}

export interface MetaVideoUploadTransferResponse {
  start_offset: string;
  end_offset: string;
}

export interface MetaVideoUploadFinishResponse {
  success: boolean;
}

export interface MetaVideoResponse {
  id: string;
  title?: string;
  thumbnails?: {
    data: Array<{
      uri: string;
      is_preferred: boolean;
    }>;
  };
}

// ── Placement Defaults ──

export const DEFAULT_PLACEMENTS = {
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions: ['feed', 'video_feeds', 'story', 'reels', 'search', 'marketplace'],
  instagram_positions: ['stream', 'story', 'reels', 'explore', 'explore_home', 'profile_feed'],
} as const;

// Audience Network is NEVER included — hardcoded exclusion
export function sanitizePlacements(placements: Partial<MetaTargeting>): Partial<MetaTargeting> {
  const sanitized = { ...placements };

  if (sanitized.publisher_platforms) {
    sanitized.publisher_platforms = sanitized.publisher_platforms.filter(
      p => p !== 'audience_network'
    );
  }

  return sanitized;
}

// ── CTA Types ──

export const META_CTA_TYPES = [
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'BOOK_NOW',
  'CONTACT_US',
  'DOWNLOAD',
  'GET_QUOTE',
  'APPLY_NOW',
  'SUBSCRIBE',
  'CALL_NOW',
  'GET_OFFER',
  'WATCH_MORE',
  'SEND_MESSAGE',
  'ORDER_NOW',
  'OPEN_LINK',
] as const;

export type MetaCTAType = (typeof META_CTA_TYPES)[number];

// ── Campaign Objectives ──

export const META_OBJECTIVES = [
  'OUTCOME_LEADS',
  'OUTCOME_TRAFFIC',
  'OUTCOME_SALES',
  'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_APP_PROMOTION',
] as const;

export type MetaObjective = (typeof META_OBJECTIVES)[number];
