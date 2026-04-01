import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaApiRequest, fetchAllPages, getAdAccountId } from '../meta/client.js';
import type { MetaAd, MetaAdCreative, MetaInsights, MetaPagedResponse } from '../meta/types.js';
import { computeMetrics } from '../lib/formatters.js';
import { rankAds, type AdWithMetrics } from '../lib/insights-analyzer.js';

export function registerWinnerTools(server: McpServer) {
  server.tool(
    'find_winners',
    'Analyze ads and rank by performance. Returns top performers with composite score, verdict, and creative copy so you can see what\'s winning.',
    {
      metric: z.enum(['roas', 'cost_per_application', 'unique_outbound_ctr', 'cost_per_unique_outbound_click', 'cost_per_lead']).describe('Primary metric to rank by'),
      campaign_id: z.string().optional().describe('Scope to a specific campaign (omit for entire account)'),
      date_preset: z.enum(['last_7d', 'last_14d', 'last_30d']).default('last_7d').describe('Date range for metrics'),
      top_n: z.number().min(1).max(50).default(10).describe('Number of top ads to return'),
      min_spend: z.number().default(10).describe('Minimum spend ($) to qualify for ranking'),
    },
    async ({ metric, campaign_id, date_preset, top_n, min_spend }) => {
      // Fetch all ads in scope
      const endpoint = campaign_id
        ? `${campaign_id}/ads`
        : `${getAdAccountId()}/ads`;

      const ads = await fetchAllPages<MetaAd>(endpoint, {
        fields: 'id,name,status,adset_id,campaign_id,creative{id}',
        limit: '100',
      });

      if (ads.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ message: 'No ads found in the specified scope', campaign_id }),
          }],
        };
      }

      // Fetch insights + creative details for each ad
      const adsWithMetrics: AdWithMetrics[] = [];

      // Process in batches of 10 to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < ads.length; i += batchSize) {
        const batch = ads.slice(i, i + batchSize);

        const results = await Promise.all(
          batch.map(async (ad) => {
            try {
              // Fetch insights
              const insightsResponse = await metaApiRequest<MetaPagedResponse<MetaInsights>>(
                `${ad.id}/insights`,
                {
                  params: {
                    date_preset,
                    fields: 'spend,impressions,clicks,reach,cpc,cpm,ctr,actions,cost_per_action_type,action_values,outbound_clicks,unique_outbound_clicks,cost_per_unique_outbound_click',
                  },
                }
              );

              if (!insightsResponse.data.length) return null;

              const computed = computeMetrics(insightsResponse.data[0]);

              // Fetch creative details for top-level copy
              let primaryText: string | undefined;
              let headline: string | undefined;

              if (ad.creative?.id) {
                try {
                  const creative = await metaApiRequest<MetaAdCreative>(
                    ad.creative.id,
                    {
                      params: {
                        fields: 'object_story_spec,asset_feed_spec',
                      },
                    }
                  );

                  const linkData = creative.object_story_spec?.link_data;
                  const videoData = creative.object_story_spec?.video_data;
                  const feedSpec = creative.asset_feed_spec;

                  primaryText = linkData?.message || videoData?.message || feedSpec?.bodies?.[0]?.text;
                  headline = linkData?.name || videoData?.title || feedSpec?.titles?.[0]?.text;
                } catch {
                  // Creative details optional
                }
              }

              // Fetch adset and campaign names
              let adsetName = ad.adset_id;
              let campaignName = ad.campaign_id;
              try {
                const [adsetRes, campaignRes] = await Promise.all([
                  metaApiRequest<{ name: string }>(ad.adset_id, { params: { fields: 'name' } }),
                  metaApiRequest<{ name: string }>(ad.campaign_id, { params: { fields: 'name' } }),
                ]);
                adsetName = adsetRes.name;
                campaignName = campaignRes.name;
              } catch {
                // Names optional
              }

              return {
                ad_id: ad.id,
                ad_name: ad.name,
                adset_name: adsetName,
                campaign_name: campaignName,
                status: ad.status,
                ...computed,
                primary_text: primaryText,
                headline,
              } satisfies AdWithMetrics;
            } catch {
              return null;
            }
          })
        );

        for (const result of results) {
          if (result) adsWithMetrics.push(result);
        }
      }

      const ranked = rankAds(adsWithMetrics, metric, min_spend, top_n);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            analysis: {
              scope: campaign_id || 'entire account',
              date_range: date_preset,
              primary_metric: metric,
              total_ads_analyzed: adsWithMetrics.length,
              qualifying_ads: ranked.length,
              min_spend_threshold: `$${min_spend}`,
            },
            winners: ranked.map((ad, i) => ({
              rank: i + 1,
              ad_id: ad.ad_id,
              ad_name: ad.ad_name,
              adset_name: ad.adset_name,
              campaign_name: ad.campaign_name,
              status: ad.status,
              composite_score: ad.composite_score,
              verdict: ad.verdict,
              metrics: {
                spend: `$${ad.spend}`,
                unique_outbound_clicks: ad.unique_outbound_clicks,
                unique_outbound_ctr: `${ad.unique_outbound_ctr}%`,
                cost_per_unique_outbound_click: `$${ad.cost_per_unique_outbound_click}`,
                applications_submitted: ad.applications_submitted,
                cost_per_application: ad.cost_per_application > 0 ? `$${ad.cost_per_application}` : 'N/A',
                roas: ad.roas,
                impressions: ad.impressions,
                leads: ad.leads,
                purchases: ad.purchases,
              },
              creative: {
                primary_text: ad.primary_text || '[not available]',
                headline: ad.headline || '[not available]',
              },
            })),
          }, null, 2),
        }],
      };
    }
  );
}
