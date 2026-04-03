# Meta Ads Workstream — Q1 2026 Analysis & Optimization

**Date:** March 28 - April 2, 2026
**Project:** ads-client (Meta Ads MCP Server)
**Campaign:** Olympus | Cold | ADV 25+ MF | Sub App | Landing Page

---

## Table of Contents

1. [MCP Server Setup & Slash Commands](#1-mcp-server-setup--slash-commands)
2. [Initial Data Pull — Active Ads](#2-initial-data-pull--active-ads)
3. [Historical Comparison — Jan 10 vs Current](#3-historical-comparison--jan-10-vs-current)
4. [Full Period Deep Dive — Jan 10 to Mar 28](#4-full-period-deep-dive--jan-10-to-mar-28)
5. [Data Correction — Fixing Conversion Tracking](#5-data-correction--fixing-conversion-tracking)
6. [Corrected Analysis with Applications Submitted](#6-corrected-analysis-with-applications-submitted)
7. [Common Factor Analysis — What's Working](#7-common-factor-analysis--whats-working)
8. [Top Ads Report Generation](#8-top-ads-report-generation)
9. [Week-by-Week Performance Trend](#9-week-by-week-performance-trend)
10. [Andromeda Framework Integration](#10-andromeda-framework-integration)
11. [Campaign Adjustments — Live Changes](#11-campaign-adjustments--live-changes)
12. [Artifacts Produced](#12-artifacts-produced)

---

## 1. MCP Server Setup & Slash Commands

**Question:** "What are the commands that I have with Meta?"

**Output:** Full inventory of 22 Meta Ads MCP tools organized by category:
- Analysis & Insights (6 tools)
- Creative Management (6 tools)
- Campaign & Ad Management (10 tools)

**Question:** "Can we create slash commands ONLY for this repo for all of these?"

**Output:** Created 22 project-level slash commands in `.claude/commands/`:

| Command | Purpose |
|---------|---------|
| `/list-campaigns` | List campaigns with spend summary |
| `/list-adsets` | List ad sets with budget/targeting |
| `/list-ads` | List ads with status/performance |
| `/get-insights` | Detailed performance metrics |
| `/get-breakdowns` | Performance by age, gender, placement |
| `/find-winners` | Rank ads by ROAS, CPA, CTR |
| `/get-creative-details` | See copy/media on an ad |
| `/create-creative` | Build creative from copy + media |
| `/update-ad-creative` | Swap copy or media on an ad |
| `/parse-ad-copy` | Parse markdown file of ad copy |
| `/upload-image` | Upload image, get image_hash |
| `/upload-video` | Upload video, get video_id |
| `/create-campaign` | New campaign (PAUSED by default) |
| `/create-adset` | New ad set with targeting/budget |
| `/create-ad` | Place creative into ad set |
| `/update-campaign-status` | Activate/pause campaigns |
| `/update-adset-status` | Activate/pause ad sets |
| `/update-ad-status` | Activate/pause ads |
| `/update-adset-placements` | Change placements |
| `/manage-budget` | Adjust daily/lifetime budget |
| `/scale-campaign` | Scale budgets by percentage |
| `/duplicate-ad` | Clone ad to another ad set |
| `/rename-campaign` | Rename a campaign (added later) |

---

## 2. Initial Data Pull — Active Ads

**Question:** "Can we /list-ads and only find the ones that are active. Then /get-insights on them."

**Output:** Found 25 active ads across 2 ad sets. Pulled 7-day insights on all 25 in parallel. Key findings at the time:

- Total 7-day spend: $112.46
- REPLACE YOUR AGENCY C5 eating 54% of budget with 5.95% CTR but zero conversions
- NOTES C25 had best CTR (11.11%) at lowest CPC ($2.13)
- **0 leads, 0 purchases, 0 ROAS across the board** (later discovered this was a tracking bug)

---

## 3. Historical Comparison — Jan 10 vs Current

**Question:** "Can we go back to Jan 10?"

**Output:** Pulled single-day insights (Jan 10) for all 25 active ads. Only Ad Set 1 was running — Ad Set 2 didn't exist yet.

**Key comparison:**

| Metric | Jan 10 | Mar 22-28 (7d) |
|--------|-------:|---------------:|
| Daily run rate | $19.36/day | ~$16.07/day |
| Top CTR | PRESELL 23.08% | NOTES C25 11.11% |
| Best CPC | PRESELL $0.31 | SCREWED DARK $0.97 |
| Avg CPM | ~$56 | ~$130 |

Finding: CPCs doubled and CPMs more than doubled since January — early signal of audience depletion.

---

## 4. Full Period Deep Dive — Jan 10 to Mar 28

**Question:** "Let's do an analysis from Jan 10 to Today... find the common factor analysis between the opening 150 characters of the primary copy, and the headlines, and what creative did we use."

**Output:** Massive multi-step analysis:

### Step 1: All Campaigns Identified
- 41 total campaigns in account
- 3 currently active: Sub App (LEADS), Video Views (ENGAGEMENT), Blogs (ENGAGEMENT)
- Sub App campaign identified as the one driving applications

### Step 2: Campaign-Level Insights (Jan 10 - Mar 28)
| Campaign | Spend | Impressions | Clicks | CTR | Leads |
|----------|------:|----------:|-------:|----:|------:|
| Sub App | $10,195 | 78,446 | 4,060 | 5.18% | 1 |
| Video Views | $2,200 | 190,817 | 436 | 0.23% | 0 |
| Blogs | $881 | 46,864 | 1,210 | 2.58% | 0 |

### Step 3: All 69 Ads Listed
The Sub App campaign contained 69 total ads across 3 ad sets with 23 unique creatives.

### Step 4: Creative Details Pulled
Full creative details (primary text, headline, description, image) pulled for all 23 unique creatives in parallel.

### Step 5: Interactive HTML Report Generated
File: `analysis-jan10-mar28.html` — Charts built with Chart.js showing spend distribution, ad set comparison, hook pattern analysis, headline frequency, and image reuse.

---

## 5. Data Correction — Fixing Conversion Tracking

**Question (from user, with Ads Manager screenshot):** "These data points are absolutely incorrect. The data inside Ads Manager shows 68 submissions for application... this is not offsite."

**Problem Identified:** The MCP server's `get_insights` tool was only tracking `lead` and `purchase` action types. "Applications Submitted" was being tracked as `offsite_conversion.fb_pixel_custom` in Meta's API — a custom pixel event the code wasn't looking for.

**Ads Manager showed:** 67 applications at $152.33/each
**MCP server showed:** 1 conversion (only catching the `lead` event)

### Code Changes Made

**File: `src/meta/types.ts`**
- Added `outbound_clicks`, `unique_outbound_clicks`, `cost_per_outbound_click`, `cost_per_unique_outbound_click` to MetaInsights interface

**File: `src/lib/formatters.ts`** — Rewrote `computeMetrics`:
- Added `unique_outbound_clicks` (not all clicks)
- Added `unique_outbound_ctr` (calculated, not from API)
- Added `applications_submitted` — checks `offsite_conversion.fb_pixel_custom`, `submit_application`, `offsite_conversion.fb_pixel_submit_application`
- Added `cost_per_application`
- Returns `all_actions` array for debugging

**File: `src/tools/insights.ts`**
- Updated API field requests for `get_insights`, `list_ads`, `get_breakdowns` to include outbound click fields
- Removed `unique_outbound_ctr` from API fields (not a valid Meta API field — must be calculated)

**File: `src/lib/insights-analyzer.ts`**
- Updated `AdWithMetrics` interface
- Changed scoring metrics to use `cost_per_application`, `unique_outbound_ctr`, `cost_per_unique_outbound_click`

**File: `src/tools/winners.ts`**
- Updated `find_winners` metric options and output format

### Iteration Required
First attempt used `unique_outbound_ctr` as an API field — Meta rejected it. Removed from field requests and calculated it manually in `computeMetrics` instead. Required 3 build/reconnect cycles to get right.

### Verified Result
After fix: **67 applications submitted, $152.16 cost per application** — matched Ads Manager exactly.

---

## 6. Corrected Analysis with Applications Submitted

**Question:** "Yes please. What we are wanting to do is do a common factor analysis and then add in more creatives..."

**Output:** Full corrected deep dive with accurate metrics.

### Ad Set Performance (Jan 10 - Mar 28)

| Ad Set | Spend | Outbound Clicks | Apps | Cost/App |
|--------|------:|:--:|:--:|--------:|
| Winners (Broad) | $7,841 | 929 | 60 | $130.69 |
| Warm | $1,915 | 151 | 7 | $273.51 |
| LLA Stack (paused) | $439 | 64 | 0 | -- |

### Per-Ad Ranking (Ad Set 1 — 60 applications attributed)

| Rank | Ad Name | Spend | Apps | $/App |
|:----:|---------|------:|:----:|------:|
| 1 | NOTES C25 | $3,131 | 21 | $149 |
| 2 | CONMAN C4 | $1,371 | 13 | $105 |
| 3 | PRESELL C28 | $1,371 | 11 | $125 |
| 4 | BEN C21 | $209 | 3 | $70 |
| 5 | STEVE C9 | $438 | 3 | $146 |
| 6 | SCREWED LIGHT C1 | $22 | 2 | $11 |
| 7 | GAMBLING C2 | $17 | 2 | $8 |
| 8 | RED PILL BLUE PILL C14 | $461 | 2 | $230 |
| 9 | JON HAMM C3 | $18 | 1 | $17 |
| 10 | NOTES C6 | $58 | 1 | $58 |
| 11 | ARE YOU A REAL DOCTOR C23 | $224 | 1 | $224 |

### Sales Funnel Integration

User provided sales stats screenshot showing full funnel:
- $13,122 ad spend -> 1,363 clicks -> 1,255 LPV -> 60 booked demos -> 43 qualified -> 34 showed -> 22 demo qualified -> 6 closes
- $51,500 cash collected, $150,000 ARR
- 3.9x cash ROAS, 11.4x ARR ROAS
- CAC: $2,187, Cash/Close: $8,583

---

## 7. Common Factor Analysis — What's Working

### Hook Patterns (Opening 150 Characters)

| Pattern | Apps | % of Total | Best Example |
|---------|:----:|:----------:|-------------|
| Sarcasm/Mockery | 22 | 32.8% | "We'll transform your practice in 30 days!" |
| Identity + Enemy | 13 | 19.4% | "If you're fighting the sickcare system..." |
| Reverse Psychology | 11 | 16.4% | "Here's how to not need Olympus..." |
| Pain Agitation | 3 | 4.5% | "Justifying, convincing, pleading..." |
| Data/Stat Lead | 3 | 4.5% | "It used to take 7 hours with 11 touches..." |

**Top 3 patterns drive 67.1% of all applications.**

### Headlines

| Headline | Apps | % |
|----------|:----:|:--:|
| "30 pAtIeNtS gUaRaNtEeD oR yOu DoNt PaY" | 22 | 32.8% |
| "Olympus: For The Practitioners Fighting Sickcare" | 13 | 19.4% |
| "How We Create Presold Patients" | 11 | 16.4% |

### Descriptions

| Description | Apps | % |
|-------------|:----:|:--:|
| "Install patient acquisition...No agency BS. No courses/consulting." | 29 | 43.3% |
| "How to spot a grifter agency before they snatch your credit card." | 22 | 32.8% |

### Creatives (Images)

| Image | Apps | % |
|-------|:----:|:--:|
| "Agency Mockery" PNG | 22 | 32.8% |
| "Sickcare Fighter" JPG | 13 | 19.4% |
| "Presold Patients" PNG | 11 | 16.4% |

**All 23 creatives are static images. Zero video tested in the Sub App campaign.**

### What's NOT Converting
- AI confusion hooks ("you opened ChatGPT...") — 0 apps
- Facebook humor (Zuck jokes) — 0 apps
- Insurance objection framing — 0 apps
- Generic headlines like "Install Patient Acquisition That Runs Itself" — weak performer despite being used on 5 creatives

---

## 8. Top Ads Report Generation

**Question:** "Can you aggregate and build me a markdown file called 'olympus-top-ads-Q1-2026'..."

**Output:** File `olympus-top-ads-Q1-2026.md` containing 6 sections:

1. **Section 1:** All 11 winning ads with full results, creative image, complete body copy, headline, and description
2. **Section 2:** Top body copies ranked by % of results
3. **Section 3:** Top headlines ranked by % of results
4. **Section 4:** Top descriptions ranked by % of results
5. **Section 5:** Top creatives (images) ranked by % of results
6. **Section 6:** Recommended NEW combinations — 4 recombinations of proven elements + 7 new body copy angles targeting untested pocket audiences

---

## 9. Week-by-Week Performance Trend

**Question:** "I want you to analyze our top ads week by week. Give me the spend for that week, and total applications submitted, CTR and clicks."

**Output:** 11-week breakdown revealing three distinct phases:

| Week | Dates | Spend | Apps | $/App | Outbound CTR |
|:----:|-------|------:|:----:|------:|:----:|
| 1 | Jan 10-16 | $1,341 | 6 | $223 | 2.09% |
| 2 | Jan 17-23 | $1,371 | **18** | **$76** | 1.89% |
| 3 | Jan 24-30 | $1,314 | 9 | $146 | 1.66% |
| 4 | Jan 31-Feb 6 | $1,344 | 9 | $149 | 1.21% |
| 5 | Feb 7-13 | $1,385 | 9 | $154 | 1.43% |
| 6 | Feb 14-20 | $1,331 | 9 | $148 | 1.41% |
| 7 | Feb 21-27 | $882 | 7 | $126 | 1.78% |
| 8 | Feb 28-Mar 6 | $679 | **0** | -- | 1.31% |
| 9 | Mar 7-13 | $233 | **0** | -- | 1.22% |
| 10 | Mar 14-20 | $175 | **0** | -- | 1.52% |
| 11 | Mar 21-28 | $141 | **0** | -- | 1.03% |

### Three Phases Identified

**Phase 1 — Launch & Peak (Weeks 1-2):** $2,711 spent, 24 apps, $113/app. Week 2 was the peak at $76/app.

**Phase 2 — Steady State (Weeks 3-7):** $6,256 spent, 43 apps, $145/app. Remarkably consistent at 9 apps/week for 4 straight weeks. CPC climbing from $6.84 to $10.42.

**Phase 3 — Dead Zone (Weeks 8-11):** $1,228 spent, **0 applications for 4 consecutive weeks.** Budget collapsed from $1,300/wk to $141/wk. Textbook pocket audience depletion per the Andromeda framework.

**Key Insight:** The pocket ran dry around Feb 21-27. The Andromeda duplication protocol should have been executed at Week 7 — lock the ad set as foundational, duplicate, remove the 3 winners, let the other 20 untested ads compete for new pockets.

---

## 10. Andromeda Framework Integration

**Question:** "Can you find inside of my downloads folder something about 'Andromeda'... I want you to read and ingest that then we think through next steps."

**Output:** Found and ingested 5 Andromeda documents:
1. `Meta_Andromeda_SOP.md` — Campaign structure and creative testing SOP
2. `andromeda_breakdown_and_spec_update.md` — Complete breakdown + Autopilot spec updates
3. `Meta Ads - Andromeda Update.md` — Jeremy Haynes video transcript
4. `The NEW Way To Scale Ads with Meta's Andromeda Update.md` — Messaging best practices
5. `Top Questions About Andromeda Update.md` — Q&A on implementation

### Current State vs Andromeda Requirements

| Requirement | Current | Gap |
|---|---|---|
| 1 Cold Campaign, ABO | Mixed ABO/CBO | Winners uses COST_CAP |
| 3 ad sets: Broad + Interest + LAL | Winners + Warm + LAL | Warm doesn't belong, missing Interest Stack |
| Same 25-30 ads in ALL ad sets | Different ads per ad set | Not aligned |
| 25-30 unique ads | 23 unique creatives | Need 2-7 more |
| 5 shared headlines | 13 different, ad-specific | Need 5 universal |
| Funnel parrots winning ad | All ads -> same URL | Major gap |
| Duplication protocol | Not following | Winners consuming all distribution |

### Recommended Next Steps

1. **Restructure:** Cold Campaign (Broad + Interest Stack + LAL Stack) + separate Warm Campaign
2. **Build to 30 creatives** using Problems/Circumstances/Outcomes framework
3. **Implement funnel parroting** — unique URLs per ad set, landing page matches winning ad
4. **Execute duplication protocol** — lock winners as foundational, duplicate, test untested ads
5. **Don't pigeonhole** — explore new pocket audiences, don't just rehash sarcasm angle

---

## 11. Campaign Adjustments — Live Changes

### Change 1: Workhorse Campaign Setup (Mar 29)

**Question:** "Keep the top three ads—keep those on. Make that campaign spend $200 a day at the ABO level. Turn off all the rest."

**Actions Taken:**

| Action | Detail | Result |
|--------|--------|:------:|
| 22 ads paused | All non-top-3 ads across ad sets 1 & 2 | 22/22 success |
| Ad Set 2 (Warm) paused | No top ads there | Success |
| Ad Set 1 budget increased | $20/day -> $200/day | Success |
| Top 3 remain ACTIVE | NOTES C25, CONMAN C4, PRESELL C28 | Running |

### Change 2: Rename Campaign Tool Created

**Question:** "Let's go ahead and create that [rename tool], and the slash command as well."

**Actions Taken:**
- Added `rename_campaign` tool to `src/tools/campaigns.ts`
- Created `/rename-campaign` slash command in `.claude/commands/rename-campaign.md`
- Build verified clean

### Change 3: Warm Ad Set Reactivated (Mar 29)

**Question:** "Can we turn the warm audience in that campaign to 25 bucks a day and turn it on."

**Actions Taken:**
- Warm ad set budget: $15/day -> $25/day
- Warm ad set status: PAUSED -> ACTIVE

### Change 4: Warm Ad Set — Converter Analysis

**Question:** "When you look at the ads inside of that warm ad set, which ones have conversions?"

**Output:** Full-period insights pulled for all 23 ads in Warm ad set.

| Ad Name | Spend | Apps | $/App |
|---------|------:|:----:|------:|
| REPLACE YOUR AGENCY C5 | $601 | 4 | $150 |
| STEVE C9 | $449 | 1 | $449 |
| BEN C21 | $167 | 1 | $167 |
| ARE YOU A REAL DOCTOR C23 | $68 | 1 | $68 |
| All others (19 ads) | $630 | 0 | -- |

### Change 5: Warm Ad Set — Final Configuration

**Question:** "Turn on replace your agency, ben, and are you a real doctor... all of the rest can be turned off."

**Actions Taken:**
- 3 ads activated: REPLACE YOUR AGENCY C5, BEN C21, ARE YOU A REAL DOCTOR C23
- All other 20 ads remain paused
- Budget: $25/day

---

## 12. Artifacts Produced

| File | Description |
|------|-------------|
| `.claude/commands/*.md` (23 files) | Project-level slash commands for all Meta Ads tools |
| `analysis-jan10-mar28.html` | Interactive Chart.js report with campaign analysis |
| `olympus-top-ads-Q1-2026.md` | Complete top ads report with copy, rankings, and recommendations |
| `workstream-meta-ads-Q1-2026.md` | This document |

### Code Changes (MCP Server)

| File | Change |
|------|--------|
| `src/meta/types.ts` | Added outbound click fields to MetaInsights |
| `src/lib/formatters.ts` | Rewrote computeMetrics for unique outbound clicks, applications submitted, all_actions |
| `src/tools/insights.ts` | Updated API fields for get_insights, list_ads, get_breakdowns |
| `src/tools/winners.ts` | Updated find_winners metrics and output |
| `src/lib/insights-analyzer.ts` | Updated AdWithMetrics interface and scoring |
| `src/tools/campaigns.ts` | Added rename_campaign tool |

---

## Current Campaign State (as of April 2, 2026)

### Sub App Campaign (`120238537276050025`)

**Ad Set 1 — Winners | Broad** (ACTIVE, $200/day, COST_CAP)
| Ad | Status |
|---|:---:|
| NOTES C25 | ACTIVE |
| CONMAN C4 | ACTIVE |
| PRESELL C28 | ACTIVE |
| All others (20 ads) | PAUSED |

**Ad Set 2 — Warm** (ACTIVE, $25/day, LOWEST_COST)
| Ad | Status |
|---|:---:|
| REPLACE YOUR AGENCY C5 | ACTIVE |
| BEN C21 | ACTIVE |
| ARE YOU A REAL DOCTOR V1 C23 | ACTIVE |
| All others (20 ads) | PAUSED |

**Ad Set 3 — LLA Stack** (PAUSED)

**Total daily budget: $225/day**

### Pending Actions
- Add horse emoji to campaign name (tool built, not yet applied)
- Build 7 new creative angles per Andromeda framework
- Implement Andromeda campaign restructure (Broad + Interest Stack + LAL)
- Set up funnel parroting (unique URLs per ad set)
- Execute duplication protocol for untested ads

---

*Document generated from workstream conversation, March 28 - April 2, 2026.*
