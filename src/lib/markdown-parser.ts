import { readFile } from 'fs/promises';

export interface ParsedAdCopy {
  variation_name: string;
  primary_text: string;
  headline: string;
  description?: string;
  call_to_action: string;
}

/**
 * Parse a markdown file containing structured ad copy variations.
 *
 * Expected format:
 *
 * # Ad Copy — Campaign Name
 *
 * ## Variation 1: Hook-based
 *
 * ### Primary Text
 * Main body copy...
 *
 * ### Headline
 * Short headline
 *
 * ### Description
 * Optional description
 *
 * ### CTA
 * LEARN_MORE
 *
 * ---
 *
 * ## Variation 2: Story-based
 * ...
 */
export async function parseAdCopyMarkdown(filePath: string): Promise<ParsedAdCopy[]> {
  const content = await readFile(filePath, 'utf-8');
  return parseMarkdownContent(content);
}

export function parseMarkdownContent(content: string): ParsedAdCopy[] {
  const variations: ParsedAdCopy[] = [];

  // Split by variation headers (## Variation N: Name)
  const variationBlocks = content.split(/^## /m).filter(block => block.trim());

  for (const block of variationBlocks) {
    // Skip the top-level # heading block
    if (block.startsWith('#') || !block.includes('###')) continue;

    const variationName = extractVariationName(block);
    const sections = parseSections(block);

    const primaryText = sections.primary_text || sections['primary text'];
    const headline = sections.headline;

    // Skip if missing required fields
    if (!primaryText || !headline) continue;

    variations.push({
      variation_name: variationName,
      primary_text: primaryText.trim(),
      headline: headline.trim(),
      description: sections.description?.trim() || undefined,
      call_to_action: (sections.cta || 'LEARN_MORE').trim().toUpperCase(),
    });
  }

  return variations;
}

function extractVariationName(block: string): string {
  const firstLine = block.split('\n')[0];
  // Match "Variation N: Name" or just "Name"
  const match = firstLine.match(/(?:variation\s*\d+\s*:\s*)?(.+)/i);
  return match?.[1]?.trim() || 'Unnamed';
}

function parseSections(block: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionRegex = /^### (.+)$/gm;
  let match: RegExpExecArray | null;
  const positions: Array<{ name: string; start: number }> = [];

  while ((match = sectionRegex.exec(block)) !== null) {
    positions.push({
      name: match[1].trim().toLowerCase().replace(/\s+/g, '_'),
      start: match.index + match[0].length,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? positions[i + 1].start - `### ${positions[i + 1].name}`.length : block.length;
    const content = block
      .slice(start, end)
      .split('\n')
      .filter(line => !line.startsWith('---'))
      .join('\n')
      .trim();
    sections[positions[i].name] = content;
  }

  return sections;
}
