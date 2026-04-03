# Workstream Log — Ads MCP Platform PRD

**Date:** April 1-2, 2026
**Participants:** JonCameron + Claude Code (Opus 4.6)
**Output:** `feature-drive-ADS-MCP-APR012026.md`

---

## Question 1: Create the initial PRD

> **Ask:** Create a simple one- to two-page feature spec for this. We really need to keep this simple. I want to be able to hand it to my engineer. Explain what we have inside of this ads client and what we've done, what we used it for. Help him understand how we're using this codebase to launch our advertising. So let's build that, because what we're going to do is also push in some of the things that we need for building out the questions that we've asked so he can understand which questions were the logic flow inside of this codebase. So let's create a very simple feature spec that can be used, or basically a product PRD essentially. It's a very simple, clean one- to two-page PRD that's sharing with him how to build.

### What Claude Did

- Read through the entire codebase: `src/index.ts`, `src/config.ts`, `src/meta/client.ts`, all 8 tool files (`insights.ts`, `winners.ts`, `creatives.ts`, `ad-copy.ts`, `ads.ts`, `campaigns.ts`, `adsets.ts`, `accounts.ts`), all lib files (`insights-analyzer.ts`, `markdown-parser.ts`, `formatters.ts`, `client-manager.ts`), and the ad copy file (`video-ad-copy-apr2026.md`)
- Checked existing memory for CTA rules

### Output Produced

`PRD.md` — a structured product reference document containing:
- What the system is (MCP server for Meta ads via CLI)
- Architecture diagram (CLI → MCP server → Meta API)
- Multi-client account management
- 4 core workflows with step-by-step tool chains:
  1. Analyze Performance (list, insights, winners, breakdowns, creative details)
  2. Launch New Ads (parse markdown → upload → create creative → create campaign/adset/ad → activate)
  3. Scale Winners (find winners → duplicate → scale budgets)
  4. Manage Status & Settings
- Key metrics table (unique outbound clicks, CTR, CPA, ROAS, etc.)
- Hardcoded rules (no Audience Network, PAUSED default, LEARN_MORE CTA, etc.)
- How we've used it (Olympus campaigns, 11 video ads, 5 copy blocks)
- Engineer quick-start (run, build, add tools, configure)

---

## Question 2: Add slash commands

> **Ask:** Can we add all the slash commands as well.

### What Claude Did

- Read all 24 slash command files from `.claude/commands/`:
  - `list-campaigns.md`, `list-adsets.md`, `list-ads.md`
  - `get-insights.md`, `get-breakdowns.md`, `get-creative-details.md`
  - `find-winners.md`
  - `create-campaign.md`, `create-adset.md`, `create-creative.md`, `create-ad.md`
  - `parse-ad-copy.md`, `upload-image.md`, `upload-video.md`
  - `update-campaign-status.md`, `update-adset-status.md`, `update-ad-status.md`
  - `update-ad-creative.md`, `update-adset-placements.md`
  - `rename-campaign.md`, `manage-budget.md`, `scale-campaign.md`
  - `duplicate-ad.md`, `switch-account.md`

### Output Produced

Added a **Slash Commands Reference** section to `PRD.md` with all 24 commands organized into 4 tables:

| Group | Count | Commands |
|-------|-------|----------|
| Account Management | 1 | `/switch-account` |
| Read / Analyze | 7 | `/list-campaigns`, `/list-adsets`, `/list-ads`, `/get-insights`, `/get-breakdowns`, `/get-creative-details`, `/find-winners` |
| Create | 7 | `/parse-ad-copy`, `/upload-image`, `/upload-video`, `/create-creative`, `/create-campaign`, `/create-adset`, `/create-ad` |
| Update / Manage | 10 | `/update-campaign-status`, `/update-adset-status`, `/update-ad-status`, `/update-ad-creative`, `/update-adset-placements`, `/rename-campaign`, `/manage-budget`, `/scale-campaign`, `/duplicate-ad` |

Each command listed with required and optional parameters, plus a section explaining how slash command files work and example CLI usage.

---

## Question 3: Rename, add Google Ads MCP, restructure with exec summary

> **Ask:** Lets rename the PRD to: feature-drive-ADS-MCP-APR012026. Can we add the information on Google MCP please?
>
> **Clarification (after Claude asked which Google MCP):** Google Ads MCP server. Yes I want to add it. We will want to manage Search ads and Video ads from it.
>
> **Additional direction:** Make sure the FIRST page is basically the executive summary since my Head of Engineering is brilliant and just needs the core high points for this PRD.

### What Claude Did

1. Renamed `PRD.md` → `feature-drive-ADS-MCP-APR012026.md`
2. Searched environment for existing Google MCP configuration (found Gmail + Calendar connectors, but no Google Ads)
3. Asked for clarification — confirmed it's a **new Google Ads MCP server** for Search + Video
4. Rewrote the entire document with a new structure

### Output Produced

Complete rewrite of `feature-drive-ADS-MCP-APR012026.md` with three sections:

**Executive Summary (page 1)** — designed for the Head of Engineering to scan:
- One-paragraph description of what exists and what's next
- Side-by-side comparison table: Meta (built) vs Google (planned)
- 4 core capabilities bullet list
- Tech stack, one line

**Part 1: Meta Ads MCP Server (Built)** — everything from Questions 1-2:
- Architecture, multi-client management, 4 workflows, metrics, rules, usage history
- Full slash commands reference (all 24 commands)

**Part 2: Google Ads MCP Server (Planned)** — new content:
- Architecture diagram (mirrors Meta structure)
- Key differences table (Meta vs Google: hierarchy, auth, GAQL, budget, creative)
- Configuration (OAuth 2.0 + developer token + customer ID)
- Search Ads tools (14 tools): RSA creation, keyword management, search terms
- Video Ads tools (5 tools): YouTube campaigns, companion copy
- Markdown format specs for Search and Video ad copy
- Shared infrastructure reuse plan (client-manager, scoring algorithm, markdown parser)
- Planned slash commands (~20, `/g-` prefixed)
- Hardcoded rules for Google (micros conversion, quota limits)
- Recommended build order (auth → reads → search creation → video creation → management → slash commands)

---

## Question 4: Document this workstream

> **Ask:** Create a markdown of this workstream of the chat conversation, the questions I asked, and the outputs produced. Make sure the document is CLEAR for someone to follow the question track.

### Output Produced

This file: `workstream-ADS-MCP-APR012026.md`

---

## Files Produced

| File | Description |
|------|-------------|
| `feature-drive-ADS-MCP-APR012026.md` | Full PRD — exec summary + Meta (built) + Google (planned) + all slash commands |
| `workstream-ADS-MCP-APR012026.md` | This workstream log |

## Files Read During Research

| File | Why |
|------|-----|
| `src/index.ts` | Entry point, tool registration, server instructions |
| `src/config.ts` | Environment variable loading, client config shape |
| `src/meta/client.ts` | Core API client — auth, rate limiting, pagination, error handling |
| `src/meta/types.ts` | (Referenced) Meta API type definitions |
| `src/tools/insights.ts` | list_campaigns, list_adsets, list_ads, get_insights, get_breakdowns |
| `src/tools/winners.ts` | find_winners — fetches all ads, scores them, returns ranked list |
| `src/tools/creatives.ts` | get_creative_details, upload_image, upload_video, create_creative |
| `src/tools/ad-copy.ts` | parse_ad_copy_markdown |
| `src/tools/ads.ts` | create_ad, update_ad_status, duplicate_ad, update_ad_creative |
| `src/tools/campaigns.ts` | create_campaign, rename_campaign, update_campaign_status, manage_budget, scale_campaign |
| `src/tools/adsets.ts` | create_adset, update_adset_status, update_adset_placements |
| `src/tools/accounts.ts` | list_accounts, current_account, switch_account, add_account, remove_account |
| `src/lib/insights-analyzer.ts` | Winner scoring algorithm — weight configs, composite scoring, verdicts |
| `src/lib/markdown-parser.ts` | Ad copy markdown parser — variation extraction |
| `src/lib/formatters.ts` | computeMetrics, summarizeTargeting, truncateForMcp |
| `src/lib/client-manager.ts` | Multi-client management — clients.json read/write, active client switching |
| `video-ad-copy-apr2026.md` | Live ad copy file — 5 copy blocks, 11 ads, Olympus campaigns |
| `.claude/commands/*.md` | All 24 slash command definitions |
| `memory/feedback_cta_rules.md` | CTA rule: LEARN_MORE always, BOOK_NOW only for hot retargeting |
