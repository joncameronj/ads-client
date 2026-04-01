import { z } from 'zod';
import { access } from 'fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { parseAdCopyMarkdown } from '../lib/markdown-parser.js';

export function registerAdCopyTools(server: McpServer) {
  server.tool(
    'parse_ad_copy_markdown',
    `Parse a local markdown file containing structured ad copy. Extracts headlines, primary text, descriptions, and CTA for each variation.

Expected markdown format:

  # Ad Copy — Campaign Name

  ## Variation 1: Hook-based

  ### Primary Text
  Main body copy above the creative...

  ### Headline
  Short punchy headline

  ### Description
  Optional supporting text

  ### CTA
  LEARN_MORE

  ---

  ## Variation 2: Story-based
  ...`,
    {
      file_path: z.string().describe('Absolute path to markdown file with ad copy'),
    },
    async ({ file_path }) => {
      await access(file_path).catch(() => {
        throw new Error(`File not found: ${file_path}`);
      });

      const variations = await parseAdCopyMarkdown(file_path);

      if (variations.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: 'No valid ad copy variations found in the file.',
              hint: 'Ensure the file uses ## Variation headers and ### Primary Text / ### Headline sections.',
            }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total_variations: variations.length,
            variations: variations.map((v, i) => ({
              index: i + 1,
              ...v,
            })),
            next_steps: 'Use create_creative with each variation\'s copy + an uploaded image/video to create ad creatives.',
          }, null, 2),
        }],
      };
    }
  );
}
