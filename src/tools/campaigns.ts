import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaApiRequest, getAdAccountId } from '../meta/client.js';
import type { MetaAdSet, MetaPagedResponse } from '../meta/types.js';

export function registerCampaignTools(server: McpServer) {
  // ── create_campaign ──
  server.tool(
    'create_campaign',
    'Create a new campaign with an objective. Created in PAUSED status for safety.',
    {
      name: z.string().describe('Campaign name'),
      objective: z.enum([
        'OUTCOME_LEADS', 'OUTCOME_TRAFFIC', 'OUTCOME_SALES',
        'OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT', 'OUTCOME_APP_PROMOTION',
      ]).describe('Campaign objective'),
      special_ad_categories: z.array(z.string()).default([]).describe('Special ad categories (e.g., HOUSING, EMPLOYMENT, CREDIT)'),
      buying_type: z.enum(['AUCTION', 'RESERVED']).default('AUCTION').describe('Buying type'),
    },
    async ({ name, objective, special_ad_categories, buying_type }) => {
      const accountId = getAdAccountId();

      const response = await metaApiRequest<{ id: string }>(
        `${accountId}/campaigns`,
        {
          method: 'POST',
          body: {
            name,
            objective,
            status: 'PAUSED',
            special_ad_categories,
            buying_type,
          },
        }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            campaign_id: response.id,
            name,
            objective,
            status: 'PAUSED',
            message: 'Campaign created in PAUSED status. Create ad sets with create_adset, then activate with update_campaign_status.',
          }, null, 2),
        }],
      };
    }
  );

  // ── rename_campaign ──
  server.tool(
    'rename_campaign',
    'Rename a campaign. Updates the campaign name in Meta Ads Manager.',
    {
      campaign_id: z.string().describe('Campaign ID to rename'),
      name: z.string().describe('New campaign name'),
    },
    async ({ campaign_id, name }) => {
      const current = await metaApiRequest<{ name: string }>(
        campaign_id,
        { params: { fields: 'name' } }
      );

      await metaApiRequest(campaign_id, {
        method: 'POST',
        body: { name },
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            campaign_id,
            previous_name: current.name,
            new_name: name,
          }, null, 2),
        }],
      };
    }
  );

  // ── update_campaign_status ──
  server.tool(
    'update_campaign_status',
    'Pause or activate one or more campaigns',
    {
      campaign_ids: z.array(z.string()).min(1).describe('Array of campaign IDs'),
      status: z.enum(['ACTIVE', 'PAUSED']).describe('New status'),
    },
    async ({ campaign_ids, status }) => {
      const results = await Promise.all(
        campaign_ids.map(async (campaignId) => {
          try {
            await metaApiRequest(campaignId, {
              method: 'POST',
              body: { status },
            });
            return { campaign_id: campaignId, success: true };
          } catch (error) {
            return {
              campaign_id: campaignId,
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
            summary: `${results.filter(r => r.success).length}/${results.length} campaigns updated`,
          }, null, 2),
        }],
      };
    }
  );

  // ── manage_budget ──
  server.tool(
    'manage_budget',
    'Update the daily or lifetime budget for an ad set or campaign. Pass amounts in dollars.',
    {
      object_id: z.string().describe('Ad set or campaign ID'),
      level: z.enum(['adset', 'campaign']).describe('Whether this is an ad set or campaign'),
      daily_budget: z.number().positive().optional().describe('New daily budget in dollars'),
      lifetime_budget: z.number().positive().optional().describe('New lifetime budget in dollars'),
    },
    async ({ object_id, level: _level, daily_budget, lifetime_budget }) => {
      if (!daily_budget && !lifetime_budget) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Provide either daily_budget or lifetime_budget' }),
          }],
          isError: true,
        };
      }

      // Get current budget first
      const current = await metaApiRequest<{ daily_budget?: string; lifetime_budget?: string }>(
        object_id,
        { params: { fields: 'daily_budget,lifetime_budget' } }
      );

      const body: Record<string, unknown> = {};
      if (daily_budget) body.daily_budget = Math.round(daily_budget * 100); // Convert to cents
      if (lifetime_budget) body.lifetime_budget = Math.round(lifetime_budget * 100);

      await metaApiRequest(object_id, { method: 'POST', body });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            object_id,
            previous: {
              daily_budget: current.daily_budget ? `$${(parseInt(current.daily_budget) / 100).toFixed(2)}` : null,
              lifetime_budget: current.lifetime_budget ? `$${(parseInt(current.lifetime_budget) / 100).toFixed(2)}` : null,
            },
            new: {
              daily_budget: daily_budget ? `$${daily_budget.toFixed(2)}` : null,
              lifetime_budget: lifetime_budget ? `$${lifetime_budget.toFixed(2)}` : null,
            },
          }, null, 2),
        }],
      };
    }
  );

  // ── scale_campaign ──
  server.tool(
    'scale_campaign',
    'Scale a campaign by adjusting all ad set budgets by a percentage. Respects the 20% rule (Meta recommends gradual scaling).',
    {
      campaign_id: z.string().describe('Campaign ID to scale'),
      scale_pct: z.number().min(-50).max(100).describe('Percentage to change budgets. +20 = 20% increase, -10 = 10% decrease. Max +100%, min -50%.'),
    },
    async ({ campaign_id, scale_pct }) => {
      // Get all ad sets in this campaign
      const adsets = await metaApiRequest<MetaPagedResponse<MetaAdSet>>(
        `${campaign_id}/adsets`,
        {
          params: {
            fields: 'id,name,daily_budget,lifetime_budget,status',
            filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
          },
        }
      );

      if (!adsets.data.length) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'No active/paused ad sets found in this campaign', campaign_id }),
          }],
          isError: true,
        };
      }

      const multiplier = 1 + scale_pct / 100;

      const results = await Promise.all(
        adsets.data.map(async (adset) => {
          const currentBudget = adset.daily_budget
            ? parseInt(adset.daily_budget)
            : adset.lifetime_budget
              ? parseInt(adset.lifetime_budget)
              : 0;

          if (currentBudget === 0) {
            return {
              id: adset.id,
              name: adset.name,
              skipped: true,
              reason: 'No budget set',
            };
          }

          const newBudget = Math.round(currentBudget * multiplier);
          const budgetField = adset.daily_budget ? 'daily_budget' : 'lifetime_budget';

          try {
            await metaApiRequest(adset.id, {
              method: 'POST',
              body: { [budgetField]: newBudget },
            });

            return {
              id: adset.id,
              name: adset.name,
              previous_budget: `$${(currentBudget / 100).toFixed(2)}`,
              new_budget: `$${(newBudget / 100).toFixed(2)}`,
              budget_type: budgetField,
              success: true,
            };
          } catch (error) {
            return {
              id: adset.id,
              name: adset.name,
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
            campaign_id,
            scale_percentage: `${scale_pct > 0 ? '+' : ''}${scale_pct}%`,
            adsets_updated: results,
            summary: `${results.filter(r => 'success' in r && r.success).length}/${results.length} ad sets scaled`,
          }, null, 2),
        }],
      };
    }
  );
}
