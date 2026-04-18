Unify videos, images, transcripts, and copy into a single campaign manifest so the MCP server knows which copy belongs to which creative.

## Usage
`/unify <campaign_type> [campaign_name]`

- `campaign_type` — `conversion` or `content` (required)
- `campaign_name` — optional human-readable campaign name; if omitted, infer from copy files or prompt the user

## Purpose
Produces a single JSON manifest under `{client_id}/{campaign_type}/manifests/` that the MCP tools (or a future one-shot campaign-creator) can consume. One manifest = one campaign = many creatives. Each creative pairs one video (or image) with one copy file.

## Output location
`{client_id}/{campaign_type}/manifests/{client_id}_{YYYY-MM-DD}_{campaign-slug}.json`

## Manifest shape
```json
{
  "client_id": "aec",
  "client_name": "Athena Eye Care",
  "campaign_type": "conversion",
  "campaign_name": "Dry Eye Consult — April 2026",
  "campaign_slug": "dry-eye-consult-apr-2026",
  "generated_at": "2026-04-17T15:50:00",
  "targeting": {
    "location": null,
    "radius_miles": null,
    "age_min": null,
    "age_max": null,
    "genders": null,
    "placements": {
      "include": ["facebook", "instagram"],
      "exclude_audience_network": true
    }
  },
  "optimization": {
    "cost_cap": null,
    "conversion_destination": null,
    "use_lead_forms": false,
    "use_ai_enhancement": false,
    "use_dco": false
  },
  "creatives": [
    {
      "id": "creative-01",
      "media_type": "video",
      "video_path": "aec/conversion/videos/AEC Video shorts/clip-1.mp4",
      "image_path": null,
      "transcript_path": "aec/conversion/transcripts/aec_2026-04-17_clip-1.md",
      "copy_path": "aec/conversion/copy/aec_2026-04-17_dry-eye-consult_medium.md",
      "copy_length": "medium",
      "offer_slug": "dry-eye-consult"
    },
    {
      "id": "creative-02",
      "media_type": "image",
      "video_path": null,
      "image_path": "aec/conversion/images/AEC Ad Images/promo-01.jpg",
      "transcript_path": null,
      "copy_path": "aec/conversion/copy/aec_2026-04-17_dry-eye-consult_short.md",
      "copy_length": "short",
      "offer_slug": "dry-eye-consult"
    }
  ],
  "rules": {
    "no_audience_network": true,
    "no_lead_forms_unless_requested": true,
    "no_ai_enhancement_unless_requested": true,
    "no_dco_unless_requested": true
  }
}
```

## Steps

1. Read `/Users/joncameron/Code/ads-client/.active-client` to get the client_id.
2. Parse `$ARGUMENTS` → `campaign_type` and optional `campaign_name`.
3. List all files under:
   - `{client_id}/{campaign_type}/videos/` (recursive)
   - `{client_id}/{campaign_type}/images/` (recursive)
   - `{client_id}/{campaign_type}/transcripts/` (md files)
   - `{client_id}/{campaign_type}/copy/` (md files)
4. Build a pairing map:
   - Match each transcript to its source video via the `source_video` frontmatter field.
   - Match each copy file to its transcript via `source_transcript` frontmatter.
   - For images that have no transcript (no audio source), ask the user which copy file to pair with each image — or infer by filename slug similarity if obvious.
5. Prompt the user for (or use sensible defaults for) targeting + optimization fields:
   - **location**, **radius_miles**, **age_min**, **age_max**, **genders** — leave `null` if not provided and flag as `TODO` in the response
   - **cost_cap** (per conversion, dollars) — `null` = no cap
   - **conversion_destination** (URL) — required for conversion campaigns; `null` = prompt user
   - `use_lead_forms`, `use_ai_enhancement`, `use_dco` — all **false** by default; only set true if user explicitly asked in `$ARGUMENTS`
6. Write the manifest JSON.
7. Print a table summary: `creative_id | media | copy_length | offer | copy_path`. Highlight any `null` or `TODO` fields and ask the user for the missing values before the manifest gets used downstream.

## Hard rules (enforce always)
- `placements.exclude_audience_network` MUST be `true`.
- `use_lead_forms`, `use_ai_enhancement`, `use_dco` default to `false`; ONLY flip to true on explicit user request.
- Every creative must have a `copy_path`. Never write a manifest with a media file that has no paired copy.

$ARGUMENTS
