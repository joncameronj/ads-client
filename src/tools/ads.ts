import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaApiRequest, getAdAccountId, getDefaultPageId } from '../meta/client.js';
import type { MetaAdCreative } from '../meta/types.js';
import { META_CTA_TYPES } from '../meta/types.js';

const CTA_ENUM = z.enum(META_CTA_TYPES);

export function registerAdTools(server: McpServer) {
  // ── create_ad ──
  server.tool(
    'create_ad',
    'Create a new ad within an existing ad set using an existing creative. Created in PAUSED status by default for safety.',
    {
      adset_id: z.string().describe('Ad set ID to add the ad to'),
      name: z.string().describe('Ad name'),
      creative_id: z.string().describe('Creative ID (from create_creative)'),
      status: z.enum(['PAUSED', 'ACTIVE']).default('PAUSED').describe('Initial status (PAUSED recommended)'),
    },
    async ({ adset_id, name, creative_id, status }) => {
      const accountId = getAdAccountId();

      const response = await metaApiRequest<{ id: string }>(
        `${accountId}/ads`,
        {
          method: 'POST',
          body: {
            name,
            adset_id,
            creative: { creative_id },
            status,
          },
        }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            ad_id: response.id,
            name,
            status,
            adset_id,
            message: status === 'PAUSED'
              ? 'Ad created in PAUSED status. Use update_ad_status to activate when ready.'
              : 'Ad created and ACTIVE.',
          }, null, 2),
        }],
      };
    }
  );

  // ── update_ad_status ──
  server.tool(
    'update_ad_status',
    'Pause or activate one or more ads',
    {
      ad_ids: z.array(z.string()).min(1).describe('Array of ad IDs to update'),
      status: z.enum(['ACTIVE', 'PAUSED']).describe('New status'),
    },
    async ({ ad_ids, status }) => {
      const results = await Promise.all(
        ad_ids.map(async (adId) => {
          try {
            await metaApiRequest(`${adId}`, {
              method: 'POST',
              body: { status },
            });
            return { ad_id: adId, success: true };
          } catch (error) {
            return {
              ad_id: adId,
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
            summary: `${results.filter(r => r.success).length}/${results.length} ads updated successfully`,
          }, null, 2),
        }],
      };
    }
  );

  // ── duplicate_ad ──
  server.tool(
    'duplicate_ad',
    'Duplicate a winning ad into a different ad set. Reads the source ad\'s creative and creates a new ad in the target ad set.',
    {
      source_ad_id: z.string().describe('Ad ID to duplicate'),
      target_adset_id: z.string().describe('Ad set ID to create the duplicate in'),
      new_name: z.string().optional().describe('Name for the new ad (defaults to "[original name] - Copy")'),
    },
    async ({ source_ad_id, target_adset_id, new_name }) => {
      // Get source ad's creative
      const sourceAd = await metaApiRequest<{ name: string; creative: { id: string } }>(
        source_ad_id,
        { params: { fields: 'name,creative{id}' } }
      );

      if (!sourceAd.creative?.id) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Source ad has no creative', source_ad_id }),
          }],
          isError: true,
        };
      }

      const adName = new_name || `${sourceAd.name} - Copy`;
      const accountId = getAdAccountId();

      const response = await metaApiRequest<{ id: string }>(
        `${accountId}/ads`,
        {
          method: 'POST',
          body: {
            name: adName,
            adset_id: target_adset_id,
            creative: { creative_id: sourceAd.creative.id },
            status: 'PAUSED',
          },
        }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            ad_id: response.id,
            name: adName,
            creative_id: sourceAd.creative.id,
            target_adset_id,
            status: 'PAUSED',
            message: 'Ad duplicated. Use update_ad_status to activate.',
          }, null, 2),
        }],
      };
    }
  );

  // ── update_ad_creative ──
  server.tool(
    'update_ad_creative',
    'Update the copy or media on an existing ad. Creates a new creative with the changes and swaps it on the ad. Only provide fields you want to change.',
    {
      ad_id: z.string().describe('Ad ID to update'),
      primary_text: z.string().optional().describe('New primary text'),
      headline: z.string().optional().describe('New headline'),
      description: z.string().optional().describe('New description'),
      call_to_action: CTA_ENUM.optional().describe('New CTA type'),
      image_hash: z.string().optional().describe('New image hash (from upload_image)'),
      video_id: z.string().optional().describe('New video ID (from upload_video)'),
    },
    async ({ ad_id, primary_text, headline, description, call_to_action, image_hash, video_id }) => {
      // Get existing creative to merge changes
      const ad = await metaApiRequest<{ creative: { id: string }; adset_id: string }>(
        ad_id,
        { params: { fields: 'creative{id},adset_id' } }
      );

      const existingCreative = await metaApiRequest<MetaAdCreative>(
        ad.creative.id,
        { params: { fields: 'name,object_story_spec' } }
      );

      const linkData = existingCreative.object_story_spec?.link_data;
      const videoData = existingCreative.object_story_spec?.video_data;
      const pageId = existingCreative.object_story_spec?.page_id || getDefaultPageId();
      const accountId = getAdAccountId();

      let newSpec: Record<string, unknown>;

      if (video_id || videoData) {
        // Video creative
        newSpec = {
          page_id: pageId,
          video_data: {
            video_id: video_id || videoData?.video_id,
            message: primary_text || videoData?.message,
            title: headline || videoData?.title,
            link_description: description || videoData?.link_description,
            call_to_action: {
              type: call_to_action || videoData?.call_to_action?.type || 'LEARN_MORE',
              value: videoData?.call_to_action?.value,
            },
            ...(image_hash && { image_url: image_hash }),
          },
        };
      } else {
        // Image/link creative
        newSpec = {
          page_id: pageId,
          link_data: {
            message: primary_text || linkData?.message,
            link: linkData?.link,
            name: headline || linkData?.name,
            description: description !== undefined ? description : linkData?.description,
            image_hash: image_hash || linkData?.image_hash,
            call_to_action: {
              type: call_to_action || linkData?.call_to_action?.type || 'LEARN_MORE',
              value: linkData?.call_to_action?.value,
            },
          },
        };
      }

      // Create new creative
      const newCreative = await metaApiRequest<{ id: string }>(
        `${accountId}/adcreatives`,
        {
          method: 'POST',
          body: {
            name: `${existingCreative.name || 'Creative'} - Updated`,
            object_story_spec: newSpec,
          },
        }
      );

      // Swap creative on the ad
      await metaApiRequest(ad_id, {
        method: 'POST',
        body: {
          creative: { creative_id: newCreative.id },
        },
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            ad_id,
            new_creative_id: newCreative.id,
            previous_creative_id: ad.creative.id,
            changes: {
              ...(primary_text && { primary_text }),
              ...(headline && { headline }),
              ...(description !== undefined && { description }),
              ...(call_to_action && { call_to_action }),
              ...(image_hash && { image_hash }),
              ...(video_id && { video_id }),
            },
          }, null, 2),
        }],
      };
    }
  );
}
