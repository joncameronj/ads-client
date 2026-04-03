# Workstream: Olympus Video Ads — April 2026

> Full session log of extracting, transcribing, copywriting, and launching 11 video ad creatives to Meta Ads from two zip files.

---

## Phase 1: Extract & Transcribe Videos

### Q: Can you open zip files, extract videos, transcribe them, give me a .md script file, then upload to Meta?

**What we established:**
- Two zip files in Downloads (~3.3GB total, 11 videos)
  - `olympus-video-ads-APR2026-1.zip` (1.28 GB)
  - `olympus-video-ads-APR2026-2.zip` (2 GB)
- User has `openai-whisper` installed (base model, MPS GPU on M1 Pro)
- "Meta Ad Library" = upload as video assets to the ad account
- Clean titles = derived from transcribed content
- Music versions share the same script as non-music versions (skip transcribing duplicates)

**Output — 11 videos identified:**

| # | Original Filename | Format | Duration |
|---|-------------------|--------|----------|
| 1 | 3 Pitfalls.mp4 | 4:5 | 6:03 |
| 2 | 3 Pitfalls_1.mp4 (music) | 4:5 | 6:03 |
| 3 | WHY YOUR PRACTICE.mp4 | 4:5 | 3:24 |
| 4 | WHY YOUR PRACTICE_1.mp4 (music) | 4:5 | 3:24 |
| 5 | fighting sickcare in the trust recession.mp4 | 4:5 | 5:13 |
| 6 | fighting sickcare in the trust recession_1.mp4 (music) | 4:5 | 5:13 |
| 7 | IS YOUR AGENCY FULL OF IT.mp4 | 4:5 | 4:57 |
| 8 | IS YOUR AGENCY FULL OF IT_1.mp4 (music) | 4:5 | 4:57 |
| 9 | Anti Agency TH banner.mp4 | 9:16 | 2:33 |
| 10 | Anti Agency TH 1350_1.mp4 | 4:5 | 2:33 |
| 11 | Olympus agency mistake 1.mov | 9:16 | 2:33 |

**Actions completed:**
1. Extracted both zips to `~/Downloads/olympus-video-ads/`
2. Transcribed 6 unique videos with Whisper base model (~100 seconds total)
3. Created `ad-scripts.md` with full transcriptions for all 5 concepts
4. Renamed all 11 files with clean titles (kebab-case)
5. Uploaded all 11 to Meta ad account (video_ids returned)

**Clean filenames applied:**

| Original | Renamed |
|----------|---------|
| 3 Pitfalls.mp4 | three-practice-marketing-pitfalls.mp4 |
| 3 Pitfalls_1.mp4 | three-practice-marketing-pitfalls-music.mp4 |
| WHY YOUR PRACTICE.mp4 | why-practice-marketing-fails.mp4 |
| WHY YOUR PRACTICE_1.mp4 | why-practice-marketing-fails-music.mp4 |
| fighting sickcare...mp4 | five-mistakes-fighting-sickcare.mp4 |
| fighting sickcare..._1.mp4 | five-mistakes-fighting-sickcare-music.mp4 |
| IS YOUR AGENCY...mp4 | is-your-agency-full-of-it.mp4 |
| IS YOUR AGENCY..._1.mp4 | is-your-agency-full-of-it-music.mp4 |
| Anti Agency TH banner.mp4 | anti-agency-burn-cash-banner.mp4 |
| Anti Agency TH 1350_1.mp4 | anti-agency-burn-cash-1350.mp4 |
| Olympus agency mistake 1.mov | anti-agency-burn-cash.mov |

---

## Phase 2: Placement Recommendations

### Q: Based on the structure and file type of each creative, what placements would you recommend? No Audience Network.

**Output — Two placement groups based on aspect ratio:**

**4:5 videos (9 files) — Feed-heavy:**
- Facebook Feed, Instagram Feed, FB Video Feed, IG Explore

**9:16 videos (2 files) — Stories & Reels:**
- Instagram Stories, Facebook Stories, Instagram Reels, Facebook Reels

**Noted:** Only the Anti-Agency creative has both aspect ratios. Other 4 concepts would need 9:16 cuts for Stories/Reels coverage.

---

## Phase 3: Ad Copy Strategy

### Q: Based on our Olympus top ads Q1 2026, what copy would you use for these?

**Reference doc:** `olympus-top-ads-Q1-2026.md`

**Key Q1 data points used:**
- Top 3 body copies drove 67.1% of all applications
- Top 3 headlines drove 68.6% of all applications
- All Q1 creatives were static images — zero video tested
- Best performers: NOTES C25 (sarcasm, 31.3%), CONMAN C4 (identity, 19.4%), PRESELL C28 (reverse psych, 16.4%)

**Initial copy was too short.** User rejected 5-line versions.

### Q: This copy is too short. It needs to use similar copy structure to our winning ads.

**Revision:** All 5 copy blocks rewritten to 300-500 words matching Q1 winner structure:
- Strong opening hook (varies by pattern)
- Problem agitation (2-3 paragraphs)
- Data/proof points
- Transition to Olympus (7 AI employees)
- "AI without the prompting"
- Month-to-month / no contracts / you own everything
- Transparency promise (pricing on page)
- CTA with link
- "JonCameron" sign-off

---

## Phase 4: Campaign Structure

### Q: Load ALL 11 ads — breakdown the naming convention, campaign structure, ad sets, and budget.

**Existing campaign used:** `Olympus | Cold | ADV 30+ MF | Sub App | Sales Page | APR012026`
- Campaign ID: `120241462046650025`
- Ad Set: `Broad | ADV 30+ | US | Sales Page | FB/IG ONLY`
- Ad Set ID: `120241462051720025`

**User requirements established:**
- ZERO AI enhancement / Advantage+
- NO Audience Network
- ONLY website conversions (no instant forms)
- Budget: $150/day (user chose aggressive over $100 recommended)
- All 11 ads in one ad set (Andromeda gets max creative variation)

**Naming convention (continuing from Q1):**

| # | Ad Name | Creative # | Format | Copy Block |
|---|---------|-----------|--------|------------|
| 1 | THREE PITFALLS \| C29 | C29 | 4:5 | Copy 1 (Pain Agitation) |
| 2 | THREE PITFALLS M \| C30 | C30 | 4:5 | Copy 1 |
| 3 | WHY MARKETING FAILS \| C31 | C31 | 4:5 | Copy 2 (Sarcasm) |
| 4 | WHY MARKETING FAILS M \| C32 | C32 | 4:5 | Copy 2 |
| 5 | SICKCARE TRUST \| C33 | C33 | 4:5 | Copy 3 (Identity) |
| 6 | SICKCARE TRUST M \| C34 | C34 | 4:5 | Copy 3 |
| 7 | AGENCY FULL OF IT \| C35 | C35 | 4:5 | Copy 4 (Data/Provocative) |
| 8 | AGENCY FULL OF IT M \| C36 | C36 | 4:5 | Copy 4 |
| 9 | BURN CASH BANNER \| C37 | C37 | 9:16 | Copy 5 (Sarcasm/Mockery) |
| 10 | BURN CASH 1350 \| C38 | C38 | 4:5 | Copy 5 |
| 11 | BURN CASH SRC \| C39 | C39 | 9:16 | Copy 5 (skipped — .mov failed processing) |

---

## Phase 5: Copy Refinements

### Q: Make copies 4 and 5 more line by line. Change qualification to $250K/yr.

- Copies 4 (AGENCY FULL OF IT) and 5 (BURN CASH) reformatted to one-sentence-per-line
- All 5 copies changed from `$300K+` to `$250K/year` (later `$250K+ annually` and `$250K+/yr`)

### Q: Remove ALL em dashes.

- 16 em dashes (—) replaced with regular dashes (-) across all 5 copies

### Q: Find the AI SLOP REMOVAL document and apply it to the copy.

**Reference doc:** `feature-write-AI-SLOP-REMOVAL-MAR222026.md` (18 banned AI patterns)

**Audit results — 3 violations found and fixed:**

| Pattern # | Pattern | Location | Fix |
|-----------|---------|----------|-----|
| 4 | Self-Posed Rhetorical | Copy 1 | "All three of these? Olympus handles them automatically." -> "Olympus handles all three automatically." |
| 4 | Self-Posed Rhetorical | Copy 1 | "What took my agency 93 days...?" -> "My agency took 93 days..." |
| 15 | Ornate Noun | Copy 3 | "content ecosystem" -> "content system" |

### Q: Can we do a different headline for Copy 4?

**User chose:** "30 pAtIeNtS gUaRaNtEeD oR yOu DoNt PaY" (Q1 #1 performer, 32.8% of apps)

### User made manual edits to the copy file:
- Copy 1: Added emoji (🛑), reformatted to line-by-line, changed `//` markers, added `*GASP*`, updated Olympus description
- Copy 2: Rewrote in more conversational voice ("follow me here lol"), added emphasis (SPEED, VOLUME, TEST), adjusted stats
- Copy 3: Added emoji mistake markers (1️⃣ 2️⃣ 3️⃣ ❌), reformatted with `==` separators, updated Olympus description with `...` continuation style

**Final copy file:** `video-ad-copy-apr2026.md` (in ads-client repo)

---

## Phase 6: Launch

### Q: Let's go ahead and launch these ads.

**Issue encountered:** `mcp__meta-ads__create_creative` returned "Invalid parameter" for all attempts.

**Root cause:** Meta API requires a video thumbnail (`image_url` or `image_hash` in `video_data`). The `create_creative` tool in `src/tools/creatives.ts` wasn't including one.

**Fix applied:** Modified `create_creative` to auto-fetch the preferred thumbnail from Meta before creating the creative.

**Since MCP server couldn't be restarted mid-session**, creatives were created via direct API calls (Python script).

**Results:**
- 10 of 11 creatives created successfully
- BURN CASH SRC | C39 (.mov) skipped — Meta failed to process that video file
- 10 ads created in ad set `120241462051720025` (PAUSED)
- Budget updated from $50/day to $150/day
- All 10 ads activated

---

## Phase 7: Video Duration Bug

### Q: The videos are only 4 seconds long. Why? I want the full length.

**Root cause found in `src/lib/upload.ts`:**

The resumable upload loop (for files >100MB) had a bug on line 114:

```
const endOffset = parseInt(startResponse.end_offset, 10);
```

Meta's start response returns `end_offset` as the **first chunk boundary** (4MB), NOT the total file size. The loop condition `while (startOffset < endOffset)` exited after uploading a single 4MB chunk.

4MB at ~9 Mbps video bitrate = ~3.5 seconds. That's the 4-second truncation.

**Fix (2 lines in `src/lib/upload.ts`):**

```diff
- const endOffset = parseInt(startResponse.end_offset, 10);
+ let endOffset = parseInt(startResponse.end_offset, 10);

  while (startOffset < endOffset) {
      // ... transfer chunk ...
      startOffset = parseInt(transferResponse.start_offset, 10);
+     endOffset = parseInt(transferResponse.end_offset, 10);
  }
```

**Re-upload process:**
1. Fixed the code (typecheck passed)
2. MCP server still running old code, so used Python script with correct logic
3. Re-uploaded all 10 videos (v3) — all chunked to 100%
4. Verified full durations:
   - Three Pitfalls: 363s (6:03)
   - Why Marketing Fails: 204s (3:24)
   - Five Mistakes Sickcare: 313s (5:13)
   - Agency Full of It: 296s (4:57)
   - Burn Cash (both): 152s (2:33)
5. Created new creatives with v3 video_ids
6. Swapped all 10 live ads to new creatives (10/10 successful)

---

## Final State

**Campaign:** `Olympus | Cold | ADV 30+ MF | Sub App | Sales Page | APR012026`

**10 video ads — ALL PAUSED, full-length videos, ready to activate:**

| Ad Name | Status | Video Duration |
|---------|--------|---------------|
| THREE PITFALLS \| C29 | PAUSED | 6:03 |
| THREE PITFALLS M \| C30 | PAUSED | 6:03 |
| WHY MARKETING FAILS \| C31 | PAUSED | 3:24 |
| WHY MARKETING FAILS M \| C32 | PAUSED | 3:24 |
| SICKCARE TRUST \| C33 | PAUSED | 5:13 |
| SICKCARE TRUST M \| C34 | PAUSED | 5:13 |
| AGENCY FULL OF IT \| C35 | PAUSED | 4:57 |
| AGENCY FULL OF IT M \| C36 | PAUSED | 4:57 |
| BURN CASH BANNER \| C37 | PAUSED | 2:33 |
| BURN CASH 1350 \| C38 | PAUSED | 2:33 |

**Budget:** $150/day (COST_CAP)

**Files produced:**
- `video-ad-copy-apr2026.md` — All 5 copy blocks with headlines, descriptions, primary text
- `~/Downloads/olympus-video-ads/ad-scripts.md` — Full video transcriptions
- `~/Downloads/olympus-video-ads/transcripts/` — Raw Whisper transcription files
- `~/Downloads/olympus-video-ads/RTS/` — 11 renamed video files

**Bugs fixed:**
1. `src/lib/upload.ts` — Resumable upload `endOffset` not updating (caused 4-second truncation)
2. `src/tools/creatives.ts` — Video creative missing thumbnail (caused "Invalid parameter" from Meta API)

**Cleanup needed:**
- Duplicate ads exist in a second ad set (`120241635553860025`) using old truncated creatives — should be deleted
