# Ads MCP Platform — Product Reference Document

## Executive Summary

We built an MCP server that lets us manage Meta (Facebook + Instagram) ad campaigns entirely from the Claude Code CLI — no Ads Manager UI. Natural language in, API calls out: "launch these 11 ads," "find the winners," "scale the top 3 by 20%."

**What exists today:** `meta-ads` MCP server — 24 tools covering the full Meta ad lifecycle (create, analyze, scale, manage) across multiple client accounts. In production since Q1 2026 running Olympus patient acquisition campaigns.

**What we're building next:** `google-ads` MCP server — same architecture, same patterns, extending coverage to Google Search ads and YouTube Video ads.

### Platform at a Glance

| | Meta Ads MCP (Built) | Google Ads MCP (Planned) |
|---|---|---|
| **Channels** | Facebook Feed, Stories, Reels + Instagram Feed, Stories, Reels | Google Search (text ads) + YouTube (video ads) |
| **API** | Meta Marketing API (Graph API v24.0) | Google Ads API (v17+) |
| **Auth** | System user token + appsecret_proof (HMAC) | OAuth 2.0 service account + developer token |
| **Multi-client** | `clients.json` with active client switching | Same pattern — reuse `client-manager.ts` |
| **Ad copy input** | Markdown files parsed by MCP | Same pattern — extend markdown parser |
| **Safety** | All writes PAUSED by default | Same — all writes PAUSED by default |
| **Tools** | 24 slash commands | ~20 slash commands (estimated) |

### Core Capabilities (Both Platforms)

1. **Analyze** — List campaigns/ad groups/ads, get performance metrics, rank winners, break down by dimension
2. **Launch** — Parse ad copy from markdown, upload media, create campaigns + ad groups + ads (PAUSED)
3. **Scale** — Duplicate winners, adjust budgets by %, manage bids
4. **Manage** — Pause/activate at any level, swap creative, update targeting

### Tech Stack

TypeScript, Node.js (ESM), `@modelcontextprotocol/sdk`, Zod, `dotenv`. Each server runs as a standalone stdio process that Claude Code connects to.

---

---

# Part 1: Meta Ads MCP Server (Built)

## Architecture

```
Claude Code CLI
     │
     │  stdio (MCP protocol)
     ▼
┌─────────────────────────────────────┐
│  meta-ads MCP Server (Node.js)      │
│                                     │
│  src/index.ts ─ tool registration   │
│  src/config.ts ─ env/client config  │
│                                     │
│  src/tools/          src/lib/       │
│  ├─ accounts.ts      ├─ client-     │
│  ├─ insights.ts      │  manager.ts  │
│  ├─ winners.ts       ├─ insights-   │
│  ├─ creatives.ts     │  analyzer.ts │
│  ├─ ad-copy.ts       ├─ markdown-   │
│  ├─ ads.ts           │  parser.ts   │
│  ├─ campaigns.ts     ├─ upload.ts   │
│  └─ adsets.ts        └─ formatters  │
│                          .ts        │
└──────────────┬──────────────────────┘
               │
               │  HTTPS (Graph API v24.0)
               ▼
        Meta Marketing API
```

## Multi-Client Account Management

Supports multiple ad accounts stored in `clients.json`. One account is active at a time — all API calls use that account's credentials (token, ad account ID, app secret).

| Tool | What It Does |
|------|-------------|
| `list_accounts` | Show all configured clients, which is active |
| `switch_account` | Change active client |
| `add_account` | Onboard a new client (slug, token, account ID, app secret) |
| `current_account` | Confirm active client |
| `remove_account` | Remove a client |

---

## Core Workflows

### 1. Analyze Performance

**Question answered:** "What's working and what isn't?"

| Step | Tool | Output |
|------|------|--------|
| See all campaigns | `list_campaigns` | Campaign names, status, 7-day spend/impressions/clicks |
| Drill into a campaign | `get_insights` | Spend, unique outbound clicks, CTR, CPA, ROAS, video completion rates |
| Rank ads by metric | `find_winners` | Composite score (0-100), verdict, creative copy for each ad |
| Breakdown by dimension | `get_breakdowns` | Performance split by age, gender, placement, device, country |
| See what creative is running | `get_creative_details` | Primary text, headline, description, CTA, image/video URLs |

**Winner scoring algorithm** (`src/lib/insights-analyzer.ts`): Weighted composite — 60% primary metric (ROAS, CPA, CTR, etc.) + 40% supporting metrics (volume, CTR, ROAS). Scores are normalized 0-100, then bucketed:
- 80+ = "Strong winner — consider scaling"
- 60-79 = "Promising — monitor and consider duplicating"
- 40-59 = "Average performer"
- <40 = "Underperformer — consider pausing"

### 2. Launch New Ads

**Question answered:** "How do we get new creative from a markdown file into live ads?"

| Step | Tool | Output |
|------|------|--------|
| Parse ad copy from file | `parse_ad_copy_markdown` | Extracts headline, primary text, description, CTA per variation |
| Upload media | `upload_image` / `upload_video` | Returns `image_hash` or `video_id` |
| Build creative | `create_creative` | Combines copy + media → `creative_id` |
| Create campaign | `create_campaign` | New campaign (PAUSED) → `campaign_id` |
| Create ad set | `create_adset` | Targeting, budget, placements → `adset_id` |
| Create ad | `create_ad` | Attaches creative to ad set (PAUSED) → `ad_id` |
| Activate | `update_ad_status` | Flips to ACTIVE |

**Ad copy format** — we write copy in markdown files (e.g., `video-ad-copy-apr2026.md`) with structured `## Copy N` blocks containing Primary Text, Headline, Description, CTA, and Video IDs. The parser extracts these into structured objects for `create_creative`.

### 3. Scale Winners

**Question answered:** "How do we put more budget behind what's working?"

| Step | Tool | Output |
|------|------|--------|
| Find top ads | `find_winners` | Ranked ads with scores |
| Clone into new audiences | `duplicate_ad` | Copies creative into different ad sets |
| Increase budgets | `scale_campaign` | Adjusts all ad set budgets by % (respects Meta's 20% rule) |
| Direct budget change | `manage_budget` | Set exact daily/lifetime budget |

### 4. Manage Status & Settings

| Tool | What It Does |
|------|-------------|
| `update_campaign_status` | Pause/activate campaigns |
| `update_adset_status` | Pause/activate ad sets |
| `update_ad_status` | Pause/activate ads |
| `update_ad_creative` | Swap copy or media on a live ad (creates new creative, swaps it) |
| `update_adset_placements` | Change placement targeting |
| `rename_campaign` | Rename a campaign |

---

## Key Metrics We Track

| Metric | Source | Notes |
|--------|--------|-------|
| **Unique outbound clicks** | Meta | Link clicks to external URL (deduplicated) |
| **Unique outbound CTR** | Computed | `unique_outbound_clicks / impressions * 100` |
| **Cost per unique outbound click** | Meta | |
| **Applications submitted** | Pixel event | `fb_pixel_custom`, `submit_application`, or `fb_pixel_submit_application` |
| **Cost per application** | Computed | `spend / applications_submitted` |
| **ROAS** | Computed | `purchase_value / spend` |
| **CPM** | Computed | `(spend / impressions) * 1000` |
| **Frequency** | Computed | `impressions / reach` |
| **Video completion** | Meta | 25%, 50%, 75%, 100% watch rates |

---

## Hardcoded Rules

1. **Audience Network is NEVER included** in placements — stripped automatically by `sanitizePlacements()`
2. **Default placements:** Facebook + Instagram only (Feed, Stories, Reels)
3. **All write operations create in PAUSED status** — must explicitly activate
4. **Budgets in dollars** — converted to cents internally (`* 100`) for Meta API
5. **CTA button:** Always `LEARN_MORE`, except `BOOK_NOW` for hot lead retargeting
6. **appsecret_proof** enabled on every API request (HMAC-SHA256)
7. **Rate limiting:** Exponential backoff with jitter (1s base, 8s max, 3 retries)
8. **30-second request timeout** via AbortController

---

## How We've Used It (Q1-Q2 2026)

- **Olympus patient acquisition campaigns** — healthcare practitioners, $250K+/yr practices
- **11 video ads across 5 copy blocks** — each with music/no-music variants
- **Hook patterns tested:** Pain Agitation, Sarcasm, Identity, Data/Provocative, Sarcasm/Mockery
- **Targeting:** US, 25-65+, interest/behavior-based + custom audiences
- **Landing page:** `https://olympus.etho.net`
- **Performance analysis** via `find_winners` to rank by ROAS and CPA, then scale winners

---

## Meta Ads Slash Commands Reference

All 24 tools are exposed as `/slash-commands` in the Claude Code CLI. Type the command and Claude handles the rest. Each command accepts `$ARGUMENTS` — pass parameters inline or Claude will prompt for required fields.

### Account Management

| Command | What It Does | Required | Optional |
|---------|-------------|----------|----------|
| `/switch-account` | Show all accounts, ask which to activate, then switch | — (interactive) | — |

### Read / Analyze

| Command | What It Does | Required | Optional |
|---------|-------------|----------|----------|
| `/list-campaigns` | List campaigns with status + 7d spend | — | `status` (ACTIVE/PAUSED/ARCHIVED), `limit` |
| `/list-adsets` | List ad sets with budget + targeting | — | `campaign_id`, `status`, `limit` |
| `/list-ads` | List ads with performance summary | — | `campaign_id`, `adset_id`, `status`, `limit` |
| `/get-insights` | Detailed metrics for any object | `object_id`, `level` | `date_preset`, `date_start`/`date_end` |
| `/get-breakdowns` | Split metrics by dimension | `object_id`, `level`, `breakdown` | `date_preset` |
| `/get-creative-details` | Full creative copy + media URLs | `ad_id` | — |
| `/find-winners` | Rank ads by composite score | `metric` | `campaign_id`, `date_preset`, `min_spend`, `top_n` |

### Create

| Command | What It Does | Required | Optional |
|---------|-------------|----------|----------|
| `/parse-ad-copy` | Parse structured markdown into ad copy variations | `file_path` | — |
| `/upload-image` | Upload local image → returns `image_hash` | `file_path` | — |
| `/upload-video` | Upload local video → returns `video_id` | `file_path` | `title` |
| `/create-creative` | Combine copy + media into a creative | `name`, `primary_text`, `headline`, `link_url` + `image_hash` or `video_id` | `description`, `call_to_action`, `page_id` |
| `/create-campaign` | New campaign (PAUSED) | `name`, `objective` | `buying_type`, `special_ad_categories` |
| `/create-adset` | New ad set with targeting + budget | `campaign_id`, `name`, `optimization_goal`, `targeting` | `daily_budget`/`lifetime_budget`, `bid_strategy`, `placements`, `start_time`/`end_time`, `temperature`, `page_id`, `pixel_id` |
| `/create-ad` | Attach creative to ad set (PAUSED) | `adset_id`, `name`, `creative_id` | `status` |

### Update / Manage

| Command | What It Does | Required | Optional |
|---------|-------------|----------|----------|
| `/update-campaign-status` | Pause or activate campaigns | `campaign_ids`, `status` | — |
| `/update-adset-status` | Pause or activate ad sets | `adset_ids`, `status` | — |
| `/update-ad-status` | Pause or activate ads | `ad_ids`, `status` | — |
| `/update-ad-creative` | Swap copy or media on a live ad | `ad_id` | `primary_text`, `headline`, `description`, `call_to_action`, `image_hash`, `video_id` |
| `/update-adset-placements` | Change placements on an ad set | `adset_id`, `placements` | — |
| `/rename-campaign` | Rename a campaign | `campaign_id`, `name` | — |
| `/manage-budget` | Set exact budget in dollars | `object_id`, `level` + `daily_budget` or `lifetime_budget` | — |
| `/scale-campaign` | Scale all ad set budgets by % | `campaign_id`, `scale_pct` | — |
| `/duplicate-ad` | Clone ad into a different ad set | `source_ad_id`, `target_adset_id` | `new_name` |

### How Slash Commands Work

Each command lives in `.claude/commands/<command-name>.md`. The file contains:
1. A description of what the command does
2. Which MCP tool it maps to (e.g., `mcp__meta-ads__list_campaigns`)
3. Instructions for Claude on what to ask for and how to present results
4. `$ARGUMENTS` — a placeholder that passes any inline args from the user

**Example usage in CLI:**
```
/list-campaigns ACTIVE
/find-winners roas
/get-insights 123456789 campaign last_30d
/scale-campaign 123456789 +20
/upload-video /path/to/video.mp4
```

---

---

# Part 2: Google Ads MCP Server (Planned)

## Overview

A second MCP server — `google-ads` — following the same architecture and patterns as `meta-ads`. Manages **Google Search ads** (text-based) and **YouTube Video ads** from the Claude Code CLI.

Same repo structure. Same multi-client account management. Same slash command patterns. The engineer who understands Part 1 can build Part 2.

## Architecture

```
Claude Code CLI
     │
     │  stdio (MCP protocol)
     ▼
┌─────────────────────────────────────┐
│  google-ads MCP Server (Node.js)    │
│                                     │
│  src/index.ts ─ tool registration   │
│  src/config.ts ─ env/client config  │
│                                     │
│  src/tools/          src/lib/       │
│  ├─ accounts.ts      ├─ client-     │
│  ├─ insights.ts      │  manager.ts  │
│  ├─ winners.ts       ├─ insights-   │
│  ├─ search-ads.ts    │  analyzer.ts │
│  ├─ video-ads.ts     ├─ markdown-   │
│  ├─ campaigns.ts     │  parser.ts   │
│  ├─ ad-groups.ts     ├─ upload.ts   │
│  └─ keywords.ts      └─ formatters  │
│                          .ts        │
└──────────────┬──────────────────────┘
               │
               │  HTTPS + gRPC (Google Ads API v17+)
               ▼
        Google Ads API
```

## Google Ads API — Key Differences from Meta

| Concept | Meta | Google |
|---------|------|--------|
| **Hierarchy** | Campaign → Ad Set → Ad | Campaign → Ad Group → Ad |
| **Auth model** | System user token + app secret HMAC | OAuth 2.0 service account + developer token + customer ID |
| **API style** | REST (Graph API) | REST or gRPC (google-ads-api npm package) |
| **Query language** | Field params + filtering JSON | GAQL (Google Ads Query Language) — SQL-like |
| **Budget location** | Ad set level (daily or lifetime) | Campaign level (daily) or shared budget |
| **Placements** | Configured per ad set | Determined by campaign type (Search vs. Video) |
| **Creative structure** | Single creative object (copy + media) | Responsive Search Ad (multiple headlines/descriptions) or Video Ad (YouTube video) |

## Configuration

```env
GOOGLE_ADS_DEVELOPER_TOKEN=     # From Google Ads API Center
GOOGLE_ADS_CLIENT_ID=           # OAuth 2.0 client ID
GOOGLE_ADS_CLIENT_SECRET=       # OAuth 2.0 client secret
GOOGLE_ADS_REFRESH_TOKEN=       # OAuth 2.0 refresh token
GOOGLE_ADS_CUSTOMER_ID=         # 10-digit customer ID (no dashes)
GOOGLE_ADS_LOGIN_CUSTOMER_ID=   # MCC account ID (if using manager account)
```

Stored in `clients.json` using the same `client-manager.ts` pattern — add/switch/remove accounts identically to Meta.

## Search Ads — Tools Needed

Google Search ads use **Responsive Search Ads (RSAs)**: up to 15 headlines (30 chars each) + 4 descriptions (90 chars each). Google mixes and matches combinations automatically.

| Tool | What It Does | Maps To |
|------|-------------|---------|
| `list_campaigns` | List Search campaigns with status + spend | Campaign query via GAQL |
| `list_ad_groups` | List ad groups with bid, status, targeting | AdGroup query |
| `list_ads` | List RSAs with headlines/descriptions | AdGroupAd query |
| `get_insights` | Metrics: clicks, impressions, CTR, CPC, conversions, cost/conv | Campaign/AdGroup/Ad metrics |
| `get_breakdowns` | Split by device, day of week, location, audience | Segmented GAQL queries |
| `find_winners` | Rank ads by conversion rate, CPA, ROAS | Reuse scoring algorithm |
| `create_campaign` | New Search campaign (PAUSED) | CampaignService.mutate |
| `create_ad_group` | New ad group with CPC bid | AdGroupService.mutate |
| `create_search_ad` | RSA with headlines + descriptions | AdGroupAdService.mutate |
| `update_ad_status` | Pause/activate ads | AdGroupAdService.mutate |
| `manage_budget` | Set daily budget | CampaignBudgetService.mutate |
| `manage_keywords` | Add/pause/remove keywords from ad group | AdGroupCriterionService.mutate |
| `get_keyword_ideas` | Keyword suggestions + search volume | KeywordPlanIdeaService |
| `get_search_terms` | Actual search terms triggering ads | SearchTermView query |

### Search Ad Copy — Markdown Format

```markdown
# Search Ad Copy — Campaign Name

## Variation 1: Benefit-focused

### Headlines
Olympus Patient Acquisition
AI-Powered Practice Growth
Get Presold Patients Fast

### Descriptions
7 AI employees handle your entire patient acquisition. No agency. No courses. Month-to-month.
Install a patient acquisition system in under an hour. Built on $41M in verified results.

### Final URL
https://olympus.etho.net
```

## Video Ads (YouTube) — Tools Needed

YouTube video ads run through Google Ads as **Video campaigns**. Formats: in-stream (skippable/non-skippable), in-feed (discovery), Shorts.

| Tool | What It Does | Maps To |
|------|-------------|---------|
| `create_video_campaign` | New Video campaign (PAUSED) | CampaignService.mutate (type=VIDEO) |
| `create_video_ad_group` | Ad group with targeting + bid | AdGroupService.mutate |
| `create_video_ad` | YouTube video ID + companion copy | AdGroupAdService.mutate |
| `get_video_insights` | Views, view rate, CPV, watch time, conversions | Metrics query with video segments |
| `list_youtube_videos` | List videos from linked YouTube channel | YouTubeVideoService or Channel API |

### Video Ad Copy — Markdown Format

```markdown
# YouTube Ad Copy — Campaign Name

## Variation 1: THREE PITFALLS

### YouTube Video ID
dQw4w9WgXcQ

### Companion Headline
How We Create Presold Patients

### Companion Description
Install patient acquisition that runs itself in 7 days or less.

### Final URL
https://olympus.etho.net

### CTA
LEARN_MORE
```

## Shared Infrastructure — What We Reuse

| Component | Reuse Strategy |
|-----------|---------------|
| `client-manager.ts` | Same multi-client pattern — just different credential fields |
| `insights-analyzer.ts` | Same scoring algorithm — swap metric names (CTR, CPA, ROAS are universal) |
| `markdown-parser.ts` | Extend to handle Search RSA format (multiple headlines/descriptions) + Video format |
| `formatters.ts` | Same `computeMetrics`, `truncateForMcp`, `summarizeTargeting` patterns |
| Slash command structure | Same `.claude/commands/` pattern, same `$ARGUMENTS` |
| Zod validation | Same input validation approach |
| Rate limiting | Same exponential backoff pattern (Google has similar rate limits) |

## Google Ads Slash Commands (Planned)

### Read / Analyze

| Command | What It Does |
|---------|-------------|
| `/g-list-campaigns` | List Google campaigns with status + spend |
| `/g-list-ad-groups` | List ad groups with bids + targeting |
| `/g-list-ads` | List ads with headlines/descriptions or video details |
| `/g-get-insights` | Detailed metrics for campaign/ad group/ad |
| `/g-get-breakdowns` | Split by device, location, day, audience |
| `/g-find-winners` | Rank ads by composite score |
| `/g-get-search-terms` | Actual queries triggering Search ads |
| `/g-get-keyword-ideas` | Keyword suggestions with volume |

### Create

| Command | What It Does |
|---------|-------------|
| `/g-create-campaign` | New Search or Video campaign (PAUSED) |
| `/g-create-ad-group` | New ad group with bid + targeting |
| `/g-create-search-ad` | RSA with multiple headlines + descriptions |
| `/g-create-video-ad` | YouTube video ad with companion copy |
| `/g-manage-keywords` | Add, pause, or remove keywords |

### Update / Manage

| Command | What It Does |
|---------|-------------|
| `/g-update-campaign-status` | Pause/activate campaigns |
| `/g-update-ad-group-status` | Pause/activate ad groups |
| `/g-update-ad-status` | Pause/activate ads |
| `/g-manage-budget` | Set daily budget |
| `/g-scale-campaign` | Scale budget by percentage |

## Hardcoded Rules (Google)

1. **All write operations create in PAUSED status** — same as Meta
2. **Budgets in dollars** — converted to micros internally (`* 1_000_000`) for Google Ads API
3. **CTA button:** `LEARN_MORE` default (same rule as Meta)
4. **Search Network only** for Search campaigns — no Display Network unless explicitly requested
5. **YouTube placements only** for Video campaigns — no Display expansion unless explicit
6. **Negative keywords** always applied at ad group level for precision
7. **Rate limiting:** Respect Google's quota (15,000 operations/day standard, 1,500 mutates/MCC)

---

---

# For the Engineer: How to Work With This

## Meta (Existing)

**Run it:** `npm start` (starts MCP server on stdio)
**Type-check:** `npm run typecheck`
**Build:** `npm run build`

**Config:** Set `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_APP_SECRET` in `.env` — or use `add_account` to store in `clients.json`.

## Google (To Build)

**Recommended package:** `google-ads-api` (npm) — wraps Google Ads API with TypeScript types and GAQL support.

**Build order:**
1. Auth + config (OAuth 2.0 token management, customer ID resolution)
2. Read tools first (`list_campaigns`, `get_insights`, `find_winners`) — prove the API connection works
3. Search ad creation (`create_campaign` → `create_ad_group` → `create_search_ad` → `manage_keywords`)
4. Video ad creation (`create_video_campaign` → `create_video_ad`)
5. Management tools (status updates, budget scaling)
6. Slash commands for each tool

## Adding a New Tool (Either Server)

1. Create or edit a file in `src/tools/`
2. Define the tool with `server.tool(name, description, zodSchema, handler)`
3. Register it in `src/index.ts`
4. Add a slash command in `.claude/commands/`

**Every tool follows the same pattern:** Zod schema validates input → call API client → format response as JSON → return MCP content block.
