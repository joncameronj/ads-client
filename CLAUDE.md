# ads-client — Meta Ads MCP Server

## Session start — pull latest

This repo is shared across machines and evolves frequently. At the start of every session, remind the user to update:

> This codebase is frequently updated. Run `git pull` before starting work to get the latest tools, slash commands, and fixes. If new dependencies landed, also run `npm install`.

Surface that reminder before taking any non-trivial action so teammates do not work against stale MCP tools.

## Overview

Standalone MCP server for managing Meta (Facebook/Instagram) ads from Claude Code CLI. Uses system user token to talk directly to Meta Marketing API.

## Tech Stack

- TypeScript, Node.js (ESM)
- `@modelcontextprotocol/sdk` — MCP server framework (stdio transport)
- `zod` — Tool input validation
- `dotenv` — Environment variable loading

## Project Structure

```
src/
├── index.ts          # MCP server entry point, tool registration
├── config.ts         # Env var loading and validation
├── meta/
│   ├── client.ts     # Core Meta API client (auth, rate limiting, pagination)
│   └── types.ts      # Meta API type definitions
├── tools/
│   ├── insights.ts   # list_campaigns, list_adsets, list_ads, get_insights, get_breakdowns
│   ├── winners.ts    # find_winners (composite scoring)
│   ├── creatives.ts  # get_creative_details, upload_image, upload_video, create_creative
│   ├── ad-copy.ts    # parse_ad_copy_markdown
│   ├── ads.ts        # create_ad, update_ad_status, duplicate_ad, update_ad_creative
│   ├── campaigns.ts  # create_campaign, update_campaign_status, manage_budget, scale_campaign
│   └── adsets.ts     # create_adset, update_adset_status, update_adset_placements
└── lib/
    ├── insights-analyzer.ts  # Winner detection scoring algorithm
    ├── markdown-parser.ts    # Ad copy markdown parser
    ├── upload.ts             # Image + video upload helpers
    └── formatters.ts         # Metric computation, response formatting
```

## Commands

- `npm start` — Run the MCP server
- `npm run typecheck` — TypeScript type checking
- `npm run build` — Compile to dist/

## Key Rules

- **Audience Network is NEVER included** in placements — hardcoded exclusion
- **Default placements**: Facebook + Instagram only (Feed, Stories, Reels)
- **All write operations default to PAUSED** — activate explicitly
- **Budgets in dollars** — converted to cents internally for Meta API
- **appsecret_proof enabled** on all API requests

## Configuration

Set in `.env` or via MCP server env config:
- `META_ACCESS_TOKEN` (required) — System user long-lived token
- `META_AD_ACCOUNT_ID` (required) — Ad account with `act_` prefix
- `META_APP_SECRET` (required) — For appsecret_proof HMAC
- `META_PAGE_ID` (optional) — Default Facebook Page
- `META_PIXEL_ID` (optional) — Default conversion pixel
- `META_API_VERSION` (optional) — Default `v24.0`
