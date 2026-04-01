import type { MetaInsights, MetaAction } from '../meta/types.js';

/**
 * Extract a specific action value from Meta's actions array
 */
export function getActionValue(actions: MetaAction[] | undefined, actionType: string): number {
  if (!actions) return 0;
  const action = actions.find(a => a.action_type === actionType);
  return action ? parseFloat(action.value) : 0;
}

/**
 * Compute derived metrics from raw Meta insights
 */
export function computeMetrics(raw: MetaInsights) {
  const spend = parseFloat(raw.spend || '0');
  const impressions = parseInt(raw.impressions || '0', 10);
  const clicks = parseInt(raw.clicks || '0', 10);
  const reach = parseInt(raw.reach || '0', 10);

  // Unique outbound clicks (link clicks to external URL)
  const uniqueOutboundClicks = getActionValue(raw.unique_outbound_clicks, 'outbound_click');
  const outboundClicks = getActionValue(raw.outbound_clicks, 'outbound_click');
  // Calculate unique outbound CTR: unique outbound clicks / impressions * 100
  const uniqueOutboundCtr = impressions > 0 && uniqueOutboundClicks > 0
    ? (uniqueOutboundClicks / impressions) * 100
    : 0;
  const costPerUniqueOutboundClick = raw.cost_per_unique_outbound_click
    ? parseFloat(raw.cost_per_unique_outbound_click.find(a => a.action_type === 'outbound_click')?.value || '0')
    : 0;

  // Applications submitted (custom pixel event)
  const applicationsSubmitted =
    getActionValue(raw.actions, 'offsite_conversion.fb_pixel_custom') ||
    getActionValue(raw.actions, 'submit_application') ||
    getActionValue(raw.actions, 'offsite_conversion.fb_pixel_submit_application');

  const costPerApplication =
    getActionValue(raw.cost_per_action_type, 'offsite_conversion.fb_pixel_custom') ||
    getActionValue(raw.cost_per_action_type, 'submit_application') ||
    getActionValue(raw.cost_per_action_type, 'offsite_conversion.fb_pixel_submit_application') ||
    (applicationsSubmitted > 0 ? spend / applicationsSubmitted : 0);

  // Standard metrics (kept for backwards compatibility)
  const leads = getActionValue(raw.actions, 'lead');
  const purchases = getActionValue(raw.actions, 'purchase') || getActionValue(raw.actions, 'offsite_conversion.fb_pixel_purchase');
  const purchaseValue = getActionValue(raw.action_values, 'purchase') || getActionValue(raw.action_values, 'offsite_conversion.fb_pixel_purchase');

  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const roas = spend > 0 ? purchaseValue / spend : 0;
  const frequency = reach > 0 ? impressions / reach : 0;

  return {
    spend: round(spend),
    impressions,
    reach,
    // Primary click metrics — unique outbound
    unique_outbound_clicks: uniqueOutboundClicks,
    outbound_clicks: outboundClicks,
    unique_outbound_ctr: round(uniqueOutboundCtr),
    cost_per_unique_outbound_click: round(costPerUniqueOutboundClick),
    // Application metrics
    applications_submitted: applicationsSubmitted,
    cost_per_application: round(costPerApplication),
    // Standard metrics
    cpm: round(cpm),
    roas: round(roas),
    frequency: round(frequency),
    leads,
    purchases,
    purchase_value: round(purchaseValue),
    // Legacy click metrics (all clicks, not just outbound)
    clicks_all: clicks,
    date_start: raw.date_start,
    date_stop: raw.date_stop,
    // Pass through breakdown fields if present
    ...(raw.age && { age: raw.age }),
    ...(raw.gender && { gender: raw.gender }),
    ...(raw.publisher_platform && { publisher_platform: raw.publisher_platform }),
    ...(raw.platform_position && { platform_position: raw.platform_position }),
    ...(raw.device_platform && { device_platform: raw.device_platform }),
    ...(raw.country && { country: raw.country }),
    // Raw actions for debugging — shows all tracked events
    all_actions: raw.actions || [],
  };
}

function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Format a targeting spec into a human-readable summary
 */
export function summarizeTargeting(targeting: Record<string, unknown> | undefined): string {
  if (!targeting) return 'No targeting set';
  const parts: string[] = [];

  const geo = targeting.geo_locations as Record<string, unknown> | undefined;
  if (geo) {
    const countries = geo.countries as string[] | undefined;
    if (countries?.length) parts.push(countries.join(', '));
  }

  const ageMin = targeting.age_min as number | undefined;
  const ageMax = targeting.age_max as number | undefined;
  if (ageMin || ageMax) {
    parts.push(`${ageMin || 18}-${ageMax || 65}+`);
  }

  const genders = targeting.genders as number[] | undefined;
  if (genders?.length) {
    const genderMap: Record<number, string> = { 1: 'M', 2: 'F' };
    parts.push(genders.map(g => genderMap[g] || '?').join('/'));
  }

  const platforms = targeting.publisher_platforms as string[] | undefined;
  if (platforms?.length) {
    parts.push(platforms.join('+'));
  }

  return parts.length > 0 ? parts.join(' | ') : 'Broad';
}

/**
 * Truncate a text response to keep MCP output manageable
 */
export function truncateForMcp(data: unknown, maxLength: number = 50000): string {
  const json = JSON.stringify(data, null, 2);
  if (json.length <= maxLength) return json;
  return json.slice(0, maxLength) + '\n\n... [truncated — use filters to narrow results]';
}
