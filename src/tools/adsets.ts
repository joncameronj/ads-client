import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaApiRequest, getAdAccountId, getDefaultPageId, getDefaultPixelId } from '../meta/client.js';
import { DEFAULT_PLACEMENTS, sanitizePlacements } from '../meta/types.js';

const placementsSchema = z.object({
  publisher_platforms: z.array(z.string()).optional(),
  facebook_positions: z.array(z.string()).optional(),
  instagram_positions: z.array(z.string()).optional(),
}).optional().describe('Custom placements. Defaults to Facebook + Instagram. Audience Network is NEVER included.');

const targetingSchema = z.object({
  geo_locations: z.object({
    countries: z.array(z.string()).optional(),
    regions: z.array(z.object({ key: z.string() })).optional(),
    cities: z.array(z.object({ key: z.string(), radius: z.number().optional() })).optional(),
  }).describe('Geographic targeting (required)'),
  age_min: z.number().min(18).max(65).optional().describe('Minimum age (18-65)'),
  age_max: z.number().min(18).max(65).optional().describe('Maximum age (18-65)'),
  genders: z.array(z.number()).optional().describe('Gender targeting: [1] = male, [2] = female, [1,2] = all'),
  flexible_spec: z.array(z.object({
    interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    behaviors: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  })).optional().describe('Interest/behavior targeting'),
  custom_audiences: z.array(z.object({ id: z.string() })).optional().describe('Custom audiences'),
  exclusions: z.object({
    custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  }).optional().describe('Exclusion targeting'),
}).describe('Targeting specification');

export function registerAdSetTools(server: McpServer) {
  // ── create_adset ──
  server.tool(
    'create_adset',
    'Create an ad set with targeting, budget, placements, and schedule. Defaults to Facebook + Instagram placements (no Audience Network).',
    {
      campaign_id: z.string().describe('Campaign ID to add the ad set to'),
      name: z.string().describe('Ad set name'),
      daily_budget: z.number().positive().optional().describe('Daily budget in dollars'),
      lifetime_budget: z.number().positive().optional().describe('Lifetime budget in dollars'),
      optimization_goal: z.enum([
        'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS', 'REACH',
        'LEAD_GENERATION', 'OFFSITE_CONVERSIONS', 'VALUE', 'POST_ENGAGEMENT',
      ]).describe('What to optimize for'),
      bid_strategy: z.enum(['LOWEST_COST_WITHOUT_CAP', 'COST_CAP', 'BID_CAP']).default('LOWEST_COST_WITHOUT_CAP').describe('Bid strategy'),
      bid_amount: z.number().positive().optional().describe('Bid cap amount in dollars (required for COST_CAP / BID_CAP)'),
      targeting: targetingSchema,
      placements: placementsSchema,
      page_id: z.string().optional().describe('Facebook Page ID (uses default if omitted)'),
      pixel_id: z.string().optional().describe('Pixel ID for conversion tracking'),
      custom_event_type: z.enum(['LEAD', 'SUBMIT_APPLICATION', 'PURCHASE', 'COMPLETE_REGISTRATION', 'SUBSCRIBE', 'CONTACT', 'ADD_TO_CART', 'INITIATED_CHECKOUT']).default('LEAD').describe('Conversion event type for pixel-based optimization'),
      start_time: z.string().optional().describe('Start time (ISO 8601)'),
      end_time: z.string().optional().describe('End time (ISO 8601, required for lifetime budget)'),
      temperature: z.enum(['COLD', 'WARM', 'HOT']).optional().describe('Temperature tag for funnel organization'),
      billing_event: z.enum(['IMPRESSIONS']).default('IMPRESSIONS').describe('Billing event'),
    },
    async ({ campaign_id, name, daily_budget, lifetime_budget, optimization_goal, bid_strategy, bid_amount, targeting, placements, page_id, pixel_id, custom_event_type, start_time, end_time, temperature: _temperature, billing_event }) => {
      if (!daily_budget && !lifetime_budget) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Provide either daily_budget or lifetime_budget' }),
          }],
          isError: true,
        };
      }

      const resolvedPageId = page_id || getDefaultPageId();
      const resolvedPixelId = pixel_id || getDefaultPixelId();
      const accountId = getAdAccountId();

      // Build targeting with placements
      const placementSpec = placements
        ? sanitizePlacements(placements)
        : { ...DEFAULT_PLACEMENTS };

      const fullTargeting = {
        ...targeting,
        ...placementSpec,
      };

      const body: Record<string, unknown> = {
        campaign_id,
        name,
        status: 'PAUSED',
        optimization_goal,
        billing_event,
        bid_strategy,
        targeting: fullTargeting,
      };

      if (daily_budget) body.daily_budget = Math.round(daily_budget * 100);
      if (lifetime_budget) body.lifetime_budget = Math.round(lifetime_budget * 100);
      if (bid_amount) body.bid_amount = Math.round(bid_amount * 100);
      if (start_time) body.start_time = start_time;
      if (end_time) body.end_time = end_time;

      if (resolvedPageId) {
        body.promoted_object = (optimization_goal === 'LEAD_GENERATION' || optimization_goal === 'POST_ENGAGEMENT')
          ? { page_id: resolvedPageId }
          : resolvedPixelId
            ? { pixel_id: resolvedPixelId, custom_event_type: custom_event_type || 'LEAD' }
            : { page_id: resolvedPageId };
      }

      const response = await metaApiRequest<{ id: string }>(
        `${accountId}/adsets`,
        { method: 'POST', body }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            adset_id: response.id,
            name,
            campaign_id,
            status: 'PAUSED',
            daily_budget: daily_budget ? `$${daily_budget}` : null,
            lifetime_budget: lifetime_budget ? `$${lifetime_budget}` : null,
            optimization_goal,
            placements: {
              platforms: (placementSpec as Record<string, unknown>).publisher_platforms || DEFAULT_PLACEMENTS.publisher_platforms,
              note: 'Audience Network excluded',
            },
            message: 'Ad set created in PAUSED status. Use create_ad to add ads, then update_adset_status to activate.',
          }, null, 2),
        }],
      };
    }
  );

  // ── update_adset_status ──
  server.tool(
    'update_adset_status',
    'Pause or activate one or more ad sets',
    {
      adset_ids: z.array(z.string()).min(1).describe('Array of ad set IDs'),
      status: z.enum(['ACTIVE', 'PAUSED']).describe('New status'),
    },
    async ({ adset_ids, status }) => {
      const results = await Promise.all(
        adset_ids.map(async (adsetId) => {
          try {
            await metaApiRequest(adsetId, {
              method: 'POST',
              body: { status },
            });
            return { adset_id: adsetId, success: true };
          } catch (error) {
            return {
              adset_id: adsetId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            status_update: status,
            results,
            summary: `${results.filter(r => r.success).length}/${results.length} ad sets updated`,
          }, null, 2),
        }],
      };
    }
  );

  // ── update_adset_placements ──
  server.tool(
    'update_adset_placements',
    'Change placements on an existing ad set. Audience Network is NEVER included.',
    {
      adset_id: z.string().describe('Ad set ID to update'),
      placements: z.object({
        publisher_platforms: z.array(z.string()).describe('Platforms: facebook, instagram, messenger'),
        facebook_positions: z.array(z.string()).optional().describe('Facebook positions'),
        instagram_positions: z.array(z.string()).optional().describe('Instagram positions'),
      }).describe('New placement configuration'),
    },
    async ({ adset_id, placements }) => {
      // Get current targeting to merge
      const current = await metaApiRequest<{ targeting: Record<string, unknown> }>(
        adset_id,
        { params: { fields: 'targeting' } }
      );

      const sanitized = sanitizePlacements(placements);

      const updatedTargeting = {
        ...current.targeting,
        ...sanitized,
      };

      await metaApiRequest(adset_id, {
        method: 'POST',
        body: { targeting: updatedTargeting },
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            adset_id,
            placements: sanitized,
            note: 'Audience Network stripped if present',
          }, null, 2),
        }],
      };
    }
  );
}
