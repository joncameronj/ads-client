import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaApiRequest, getAdAccountId } from '../meta/client.js';
import type { MetaCampaign, MetaAdSet, MetaAd, MetaInsights, MetaPagedResponse } from '../meta/types.js';
import { computeMetrics, summarizeTargeting, truncateForMcp } from '../lib/formatters.js';

const STATUS_ENUM = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL']).default('ALL');
const DATE_PRESET_ENUM = z.enum(['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'lifetime']).default('last_7d');

export function registerInsightTools(server: McpServer) {
  // ── list_campaigns ──
  server.tool(
    'list_campaigns',
    'List all campaigns with status and last 7d spend summary',
    {
      status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL']).default('ALL').describe('Filter by campaign status'),
      limit: z.number().min(1).max(100).default(25).describe('Max campaigns to return'),
    },
    async ({ status, limit }) => {
      const accountId = getAdAccountId();
      const fields = 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,special_ad_categories,buying_type';

      const params: Record<string, string> = {
        fields,
        limit: limit.toString(),
      };
      if (status !== 'ALL') {
        params.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [status] }]);
      }

      const response = await metaApiRequest<MetaPagedResponse<MetaCampaign>>(
        `${accountId}/campaigns`,
        { params }
      );

      // Fetch last 7d spend for each campaign
      const campaignsWithSpend = await Promise.all(
        response.data.map(async (campaign) => {
          try {
            const insights = await metaApiRequest<MetaPagedResponse<MetaInsights>>(
              `${campaign.id}/insights`,
              { params: { date_preset: 'last_7d', fields: 'spend,impressions,clicks' } }
            );
            const metrics = insights.data[0];
            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              daily_budget: campaign.daily_budget ? `$${(parseInt(campaign.daily_budget) / 100).toFixed(2)}` : null,
              lifetime_budget: campaign.lifetime_budget ? `$${(parseInt(campaign.lifetime_budget) / 100).toFixed(2)}` : null,
              last_7d_spend: metrics?.spend ? `$${parseFloat(metrics.spend).toFixed(2)}` : '$0.00',
              last_7d_impressions: metrics?.impressions || '0',
              last_7d_clicks: metrics?.clicks || '0',
              created: campaign.created_time,
            };
          } catch {
            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              daily_budget: campaign.daily_budget ? `$${(parseInt(campaign.daily_budget) / 100).toFixed(2)}` : null,
              lifetime_budget: campaign.lifetime_budget ? `$${(parseInt(campaign.lifetime_budget) / 100).toFixed(2)}` : null,
              last_7d_spend: 'N/A',
              created: campaign.created_time,
            };
          }
        })
      );

      return {
        content: [{
          type: 'text' as const,
          text: truncateForMcp({
            total: campaignsWithSpend.length,
            campaigns: campaignsWithSpend,
          }),
        }],
      };
    }
  );

  // ── list_adsets ──
  server.tool(
    'list_adsets',
    'List ad sets with budget, targeting summary, and placements',
    {
      campaign_id: z.string().optional().describe('Filter by campaign ID'),
      status: STATUS_ENUM.describe('Filter by ad set status'),
      limit: z.number().min(1).max(100).default(25).describe('Max ad sets to return'),
    },
    async ({ campaign_id, status, limit }) => {
      const endpoint = campaign_id
        ? `${campaign_id}/adsets`
        : `${getAdAccountId()}/adsets`;

      const fields = 'id,name,status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy,targeting,start_time,end_time,created_time';

      const params: Record<string, string> = {
        fields,
        limit: limit.toString(),
      };
      if (status !== 'ALL') {
        params.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [status] }]);
      }

      const response = await metaApiRequest<MetaPagedResponse<MetaAdSet>>(endpoint, { params });

      const adsets = response.data.map(adset => ({
        id: adset.id,
        name: adset.name,
        status: adset.status,
        campaign_id: adset.campaign_id,
        daily_budget: adset.daily_budget ? `$${(parseInt(adset.daily_budget) / 100).toFixed(2)}` : null,
        lifetime_budget: adset.lifetime_budget ? `$${(parseInt(adset.lifetime_budget) / 100).toFixed(2)}` : null,
        optimization_goal: adset.optimization_goal,
        bid_strategy: adset.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
        targeting_summary: summarizeTargeting(adset.targeting as unknown as Record<string, unknown>),
        placements: {
          platforms: adset.targeting?.publisher_platforms || ['automatic'],
          facebook: adset.targeting?.facebook_positions || [],
          instagram: adset.targeting?.instagram_positions || [],
        },
      }));

      return {
        content: [{
          type: 'text' as const,
          text: truncateForMcp({ total: adsets.length, adsets }),
        }],
      };
    }
  );

  // ── list_ads ──
  server.tool(
    'list_ads',
    'List individual ads with status and performance summary',
    {
      adset_id: z.string().optional().describe('Filter by ad set ID'),
      campaign_id: z.string().optional().describe('Filter by campaign ID'),
      status: STATUS_ENUM.describe('Filter by ad status'),
      limit: z.number().min(1).max(100).default(25).describe('Max ads to return'),
    },
    async ({ adset_id, campaign_id, status, limit }) => {
      let endpoint: string;
      if (adset_id) {
        endpoint = `${adset_id}/ads`;
      } else if (campaign_id) {
        endpoint = `${campaign_id}/ads`;
      } else {
        endpoint = `${getAdAccountId()}/ads`;
      }

      const fields = 'id,name,status,adset_id,campaign_id,creative{id},created_time';
      const params: Record<string, string> = {
        fields,
        limit: limit.toString(),
      };
      if (status !== 'ALL') {
        params.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [status] }]);
      }

      const response = await metaApiRequest<MetaPagedResponse<MetaAd>>(endpoint, { params });

      // Fetch insights for each ad
      const adsWithMetrics = await Promise.all(
        response.data.map(async (ad) => {
          try {
            const insights = await metaApiRequest<MetaPagedResponse<MetaInsights>>(
              `${ad.id}/insights`,
              { params: { date_preset: 'last_7d', fields: 'spend,impressions,clicks,reach,ctr,cpc,actions,cost_per_action_type,action_values,outbound_clicks,unique_outbound_clicks,cost_per_unique_outbound_click' } }
            );
            const computed = insights.data[0] ? computeMetrics(insights.data[0]) : null;
            return {
              id: ad.id,
              name: ad.name,
              status: ad.status,
              adset_id: ad.adset_id,
              campaign_id: ad.campaign_id,
              creative_id: ad.creative?.id,
              metrics_7d: computed ? {
                spend: `$${computed.spend}`,
                impressions: computed.impressions,
                unique_outbound_clicks: computed.unique_outbound_clicks,
                unique_outbound_ctr: `${computed.unique_outbound_ctr}%`,
                cost_per_unique_outbound_click: `$${computed.cost_per_unique_outbound_click}`,
                applications_submitted: computed.applications_submitted,
                cost_per_application: `$${computed.cost_per_application}`,
                roas: computed.roas,
              } : null,
            };
          } catch {
            return {
              id: ad.id,
              name: ad.name,
              status: ad.status,
              adset_id: ad.adset_id,
              campaign_id: ad.campaign_id,
              creative_id: ad.creative?.id,
              metrics_7d: null,
            };
          }
        })
      );

      return {
        content: [{
          type: 'text' as const,
          text: truncateForMcp({ total: adsWithMetrics.length, ads: adsWithMetrics }),
        }],
      };
    }
  );

  // ── get_insights ──
  server.tool(
    'get_insights',
    'Get detailed performance metrics (spend, ROAS, CPA, CTR, CPM, conversions, leads) for a campaign, ad set, or ad',
    {
      object_id: z.string().describe('Campaign, ad set, or ad ID'),
      level: z.enum(['campaign', 'adset', 'ad']).describe('Level of the object'),
      date_start: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      date_end: z.string().optional().describe('End date (YYYY-MM-DD)'),
      date_preset: DATE_PRESET_ENUM.describe('Predefined date range (used if date_start/date_end not provided)'),
    },
    async ({ object_id, level: _level, date_start, date_end, date_preset }) => {
      const fields = 'spend,impressions,clicks,reach,cpc,cpm,ctr,actions,cost_per_action_type,action_values,outbound_clicks,unique_outbound_clicks,cost_per_outbound_click,cost_per_unique_outbound_click,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,frequency';

      const params: Record<string, string> = { fields };

      if (date_start && date_end) {
        params.time_range = JSON.stringify({ since: date_start, until: date_end });
      } else {
        params.date_preset = date_preset;
      }

      const response = await metaApiRequest<MetaPagedResponse<MetaInsights>>(
        `${object_id}/insights`,
        { params }
      );

      if (!response.data.length) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ message: 'No data available for the selected date range', object_id }),
          }],
        };
      }

      const computed = computeMetrics(response.data[0]);

      // Add video metrics if present
      const raw = response.data[0];
      const videoMetrics = {
        video_25pct_views: raw.video_p25_watched_actions?.[0]?.value || null,
        video_50pct_views: raw.video_p50_watched_actions?.[0]?.value || null,
        video_75pct_views: raw.video_p75_watched_actions?.[0]?.value || null,
        video_100pct_views: raw.video_p100_watched_actions?.[0]?.value || null,
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ ...computed, ...videoMetrics }, null, 2),
        }],
      };
    }
  );

  // ── get_breakdowns ──
  server.tool(
    'get_breakdowns',
    'Break down performance metrics by dimension (age, gender, placement, device, country)',
    {
      object_id: z.string().describe('Campaign, ad set, or ad ID'),
      level: z.enum(['campaign', 'adset', 'ad']).describe('Level of the object'),
      breakdown: z.enum(['age', 'gender', 'placement', 'device', 'country', 'age,gender']).describe('Breakdown dimension'),
      date_preset: DATE_PRESET_ENUM.describe('Date range'),
    },
    async ({ object_id, level: _level, breakdown, date_preset }) => {
      const fields = 'spend,impressions,clicks,reach,cpc,cpm,ctr,actions,cost_per_action_type,action_values,outbound_clicks,unique_outbound_clicks,cost_per_unique_outbound_click';

      // Map breakdown to Meta API fields
      const breakdownMap: Record<string, string> = {
        'age': 'age',
        'gender': 'gender',
        'placement': 'publisher_platform,platform_position',
        'device': 'device_platform',
        'country': 'country',
        'age,gender': 'age,gender',
      };

      const params: Record<string, string> = {
        fields,
        breakdowns: breakdownMap[breakdown],
        date_preset,
        limit: '100',
      };

      const response = await metaApiRequest<MetaPagedResponse<MetaInsights>>(
        `${object_id}/insights`,
        { params }
      );

      const rows = response.data.map(row => computeMetrics(row));

      return {
        content: [{
          type: 'text' as const,
          text: truncateForMcp({
            object_id,
            breakdown,
            date_preset,
            total_rows: rows.length,
            data: rows,
          }),
        }],
      };
    }
  );
}
