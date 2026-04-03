import { z } from 'zod';
import { access } from 'fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaApiRequest, getAdAccountId, getDefaultPageId } from '../meta/client.js';
import type { MetaAdCreative } from '../meta/types.js';
import { META_CTA_TYPES } from '../meta/types.js';
import { uploadImage as uploadImageHelper } from '../lib/upload.js';
import { uploadVideo as uploadVideoHelper } from '../lib/upload.js';

const CTA_ENUM = z.enum(META_CTA_TYPES);

export function registerCreativeTools(server: McpServer) {
  // ── get_creative_details ──
  server.tool(
    'get_creative_details',
    'Get full creative details for an ad including copy text (primary_text, headline, description), CTA, image/video URLs',
    {
      ad_id: z.string().describe('The ad ID to get creative details for'),
    },
    async ({ ad_id }) => {
      // First get the creative ID from the ad
      const ad = await metaApiRequest<{ creative: { id: string } }>(ad_id, {
        params: { fields: 'creative{id}' },
      });

      const creativeId = ad.creative?.id;
      if (!creativeId) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'No creative found for this ad', ad_id }),
          }],
        };
      }

      const creative = await metaApiRequest<MetaAdCreative>(creativeId, {
        params: {
          fields: 'id,name,object_story_spec,asset_feed_spec,thumbnail_url,image_url,effective_object_story_id',
        },
      });

      // Extract readable copy from the creative
      const linkData = creative.object_story_spec?.link_data;
      const videoData = creative.object_story_spec?.video_data;
      const feedSpec = creative.asset_feed_spec;

      const result: Record<string, unknown> = {
        creative_id: creative.id,
        name: creative.name,
      };

      if (linkData) {
        result.type = 'link/image';
        result.primary_text = linkData.message;
        result.headline = linkData.name;
        result.description = linkData.description;
        result.cta = linkData.call_to_action?.type;
        result.link_url = linkData.link || linkData.call_to_action?.value?.link;
        result.image_hash = linkData.image_hash;
        result.image_url = linkData.picture;
      } else if (videoData) {
        result.type = 'video';
        result.primary_text = videoData.message;
        result.headline = videoData.title;
        result.description = videoData.link_description;
        result.cta = videoData.call_to_action?.type;
        result.link_url = videoData.call_to_action?.value?.link;
        result.video_id = videoData.video_id;
        result.thumbnail_url = videoData.image_url;
      } else if (feedSpec) {
        result.type = 'dynamic_creative';
        result.bodies = feedSpec.bodies?.map(b => b.text);
        result.headlines = feedSpec.titles?.map(t => t.text);
        result.descriptions = feedSpec.descriptions?.map(d => d.text);
        result.cta_types = feedSpec.call_to_action_types;
        result.link_urls = feedSpec.link_urls?.map(u => u.website_url);
        result.images = feedSpec.images?.map(i => ({ hash: i.hash, url: i.url }));
        result.videos = feedSpec.videos?.map(v => ({ id: v.video_id, thumbnail: v.thumbnail_url }));
      }

      // Promoted page post fallback — copy lives on the original post
      if (!linkData && !videoData && !feedSpec && creative.effective_object_story_id) {
        result.type = 'promoted_post';
        result.effective_object_story_id = creative.effective_object_story_id;

        try {
          const post = await metaApiRequest<{
            message?: string;
            name?: string;
            description?: string;
            full_picture?: string;
            permalink_url?: string;
            attachments?: { data?: Array<{ title?: string; description?: string; url?: string }> };
          }>(creative.effective_object_story_id, {
            params: { fields: 'message,name,description,full_picture,permalink_url,attachments' },
          });

          result.primary_text = post.message;
          result.headline = post.name || post.attachments?.data?.[0]?.title;
          result.description = post.description || post.attachments?.data?.[0]?.description;
          result.link_url = post.permalink_url || post.attachments?.data?.[0]?.url;
          result.full_picture = post.full_picture;
        } catch {
          result.note = 'Could not fetch post content — post may require page token permissions';
        }
      }

      if (creative.thumbnail_url) result.thumbnail_url = creative.thumbnail_url;
      if (creative.image_url) result.image_url = creative.image_url;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // ── upload_image ──
  server.tool(
    'upload_image',
    'Upload a local image file to Meta as an ad image. Returns the image_hash for use in create_creative. Supports JPG, PNG. Max 30MB.',
    {
      file_path: z.string().describe('Absolute path to local image file'),
    },
    async ({ file_path }) => {
      await access(file_path).catch(() => {
        throw new Error(`File not found: ${file_path}`);
      });

      const result = await uploadImageHelper(file_path);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            image_hash: result.image_hash,
            url: result.url,
            message: 'Image uploaded. Use the image_hash with create_creative to build an ad creative.',
          }, null, 2),
        }],
      };
    }
  );

  // ── upload_video ──
  server.tool(
    'upload_video',
    'Upload a local video file to Meta. Returns the video_id for use in create_creative. Supports MP4, MOV. Large files use resumable upload.',
    {
      file_path: z.string().describe('Absolute path to local video file'),
      title: z.string().optional().describe('Video title in Meta library'),
    },
    async ({ file_path, title }) => {
      await access(file_path).catch(() => {
        throw new Error(`File not found: ${file_path}`);
      });

      const result = await uploadVideoHelper(file_path, title);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            video_id: result.video_id,
            thumbnail_url: result.thumbnail_url,
            message: 'Video uploaded. Use the video_id with create_creative to build an ad creative.',
          }, null, 2),
        }],
      };
    }
  );

  // ── create_creative ──
  server.tool(
    'create_creative',
    'Create an ad creative from copy text + uploaded media. Requires either image_hash (from upload_image) or video_id (from upload_video).',
    {
      name: z.string().describe('Creative name'),
      primary_text: z.string().describe('Main ad body text that appears above the creative'),
      headline: z.string().describe('Short headline below the creative'),
      description: z.string().optional().describe('Optional description text'),
      call_to_action: CTA_ENUM.default('LEARN_MORE').describe('CTA button type'),
      link_url: z.string().url().describe('Landing page URL'),
      page_id: z.string().optional().describe('Facebook Page ID (uses default if omitted)'),
      image_hash: z.string().optional().describe('Image hash from upload_image'),
      video_id: z.string().optional().describe('Video ID from upload_video'),
    },
    async ({ name, primary_text, headline, description, call_to_action, link_url, page_id, image_hash, video_id }) => {
      if (!image_hash && !video_id) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Either image_hash or video_id is required. Use upload_image or upload_video first.' }),
          }],
          isError: true,
        };
      }

      const resolvedPageId = page_id || getDefaultPageId();
      if (!resolvedPageId) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'page_id is required. Set META_PAGE_ID in env or pass page_id parameter.' }),
          }],
          isError: true,
        };
      }

      const accountId = getAdAccountId();

      let objectStorySpec: Record<string, unknown>;

      if (video_id) {
        // Fetch preferred thumbnail from Meta
        let thumbnailUrl: string | undefined;
        try {
          const thumbResponse = await metaApiRequest<{ thumbnails?: { data?: Array<{ uri: string; is_preferred: boolean }> } }>(
            video_id,
            { params: { fields: 'thumbnails' } }
          );
          const preferred = thumbResponse.thumbnails?.data?.find(t => t.is_preferred);
          thumbnailUrl = preferred?.uri || thumbResponse.thumbnails?.data?.[0]?.uri;
        } catch {
          // Thumbnail fetch failed — will try without it
        }

        objectStorySpec = {
          page_id: resolvedPageId,
          video_data: {
            video_id,
            message: primary_text,
            title: headline,
            link_description: description || headline,
            ...(thumbnailUrl && { image_url: thumbnailUrl }),
            call_to_action: {
              type: call_to_action,
              value: { link: link_url },
            },
          },
        };
      } else {
        objectStorySpec = {
          page_id: resolvedPageId,
          link_data: {
            message: primary_text,
            link: link_url,
            name: headline,
            description: description || undefined,
            image_hash,
            call_to_action: {
              type: call_to_action,
              value: { link: link_url },
            },
          },
        };
      }

      const response = await metaApiRequest<{ id: string }>(
        `${accountId}/adcreatives`,
        {
          method: 'POST',
          body: {
            name,
            object_story_spec: objectStorySpec,
          },
        }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            creative_id: response.id,
            message: 'Creative created. Use the creative_id with create_ad to attach it to an ad set.',
          }, null, 2),
        }],
      };
    }
  );
}
