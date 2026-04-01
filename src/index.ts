import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig } from './config.js';
import { registerInsightTools } from './tools/insights.js';
import { registerWinnerTools } from './tools/winners.js';
import { registerCreativeTools } from './tools/creatives.js';
import { registerAdCopyTools } from './tools/ad-copy.js';
import { registerAdTools } from './tools/ads.js';
import { registerCampaignTools } from './tools/campaigns.js';
import { registerAdSetTools } from './tools/adsets.js';

// Validate config at startup
try {
  getConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuration error');
  process.exit(1);
}

const server = new McpServer({
  name: 'meta-ads',
  version: '1.0.0',
}, {
  instructions: `Meta Ads MCP Server — Full lifecycle management of Meta (Facebook/Instagram) ads.

## Quick Start
1. list_campaigns — see what's running
2. find_winners — rank ads by ROAS, CPA, CTR, etc.
3. get_creative_details — see the copy/media on any ad
4. Upload new creatives → create ads → activate

## Workflow: Analyze Current Ads
1. list_campaigns → pick a campaign
2. get_insights (campaign level) → see overall performance
3. find_winners (metric=roas or cpa) → identify top performers
4. get_creative_details → see what copy/media is working
5. get_breakdowns → see which age/gender/placement performs best

## Workflow: Upload New Creatives
1. parse_ad_copy_markdown — reads a local .md file with ad copy variations
2. upload_image / upload_video — uploads local media to Meta
3. create_creative — combines copy + media into an ad creative
4. create_ad — places the creative into an ad set (PAUSED by default)
5. update_ad_status — activate when ready

## Workflow: Scale Winners
1. find_winners → identify top ads
2. duplicate_ad → clone into new ad sets for different audiences
3. scale_campaign → increase budgets by a safe percentage

## Placement Rules
- Default: Facebook + Instagram (Feed, Stories, Reels)
- Audience Network is NEVER included (hardcoded exclusion)
- Customize with the placements parameter on create_adset

## Ad Copy Markdown Format
\`\`\`markdown
# Ad Copy — Campaign Name

## Variation 1: Hook-based

### Primary Text
Main body copy...

### Headline
Short headline

### Description
Optional description

### CTA
LEARN_MORE
\`\`\`

## Budget Notes
- All budgets are in dollars (converted to cents internally)
- scale_campaign respects Meta's 20% rule for safe scaling
- All new campaigns/adsets/ads are created PAUSED for safety`,
});

// Register all tools
registerInsightTools(server);
registerWinnerTools(server);
registerCreativeTools(server);
registerAdCopyTools(server);
registerAdTools(server);
registerCampaignTools(server);
registerAdSetTools(server);

// Global error handlers
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error instanceof Error ? error.message : error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  process.exit(1);
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
