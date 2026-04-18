Convert a transcript markdown into Meta ad copy. You (the Claude harness) are the copywriter — no external API needed.

## Usage
`/convert-to-copy <campaign_type> <length> <transcript_file> [--variations N]`

- `campaign_type` — `conversion` or `content` (required)
- `length` — `short` | `medium` | `long` (required)
  - `short` — Primary Text ≤ 500 characters
  - `medium` — Primary Text ≤ 2000 characters
  - `long` — Primary Text ≤ 2500 characters
- `transcript_file` — path to a transcript md (e.g. `aec/conversion/transcripts/aec_2026-04-17_clip-1.md`)
- `--variations N` — optional, default 3. Produce N distinct angle variations.

## What it does
1. Reads the transcript md (including its YAML frontmatter: client_id, client_name, campaign_type, source_video).
2. Infers the offer/topic from the transcript (e.g. "dry-eye-consult", "lasik-consult", "eyewear-trunk-show"). This becomes the filename slug.
3. Writes an ad copy markdown in the format expected by `parse_ad_copy_markdown` (Primary Text / Headline / Description / CTA).
4. Saves to: `{client_id}/{campaign_type}/copy/{client_id}_{YYYY-MM-DD}_{offer-slug}_{length}.md`

## Copywriting rules
- **Primary Text** obeys the length budget above. No emoji spam. Lead with the hook.
- **Headline** — short, specific, ≤ 40 characters. No title case; match the brand voice.
- **Description** — one clean sentence reinforcing the offer. Omit if redundant.
- **CTA** — apply the saved client rule:
  - Default: `LEARN_MORE`
  - `BOOK_NOW` **only** when the campaign is retargeting hot leads (user must say so explicitly).
  - For `campaign_type=content`, default is `LEARN_MORE`. Never `BOOK_NOW` without explicit instruction.
- Speak to the listener, not about them. Prefer concrete outcomes over jargon.
- Do NOT add claims that aren't supported by the transcript.
- Vary the angle across variations (e.g. V1: pain-point hook, V2: social-proof, V3: practical how-it-works).

## Output markdown template
```markdown
---
client_id: {client_id}
client_name: {client_name}
campaign_type: {campaign_type}
length: {length}
source_transcript: {transcript_file}
source_video: {source_video from transcript frontmatter}
generated_at: {ISO timestamp}
offer_slug: {inferred-slug}
campaign_name: {inferred human campaign name}
---

# Ad Copy — {campaign_name}

## Variation 1: {Angle}

### Primary Text
{body, obeying length budget}

### Headline
{short}

### Description
{optional}

### CTA
LEARN_MORE

---

## Variation 2: {Angle}
...
```

## Steps
1. Read the transcript md file. Parse frontmatter → `client_id`, `client_name`, `campaign_type`, `source_video`.
2. Validate `campaign_type` arg matches the frontmatter; warn if not.
3. Compute `max_chars` from `length`: short=500, medium=2000, long=2500.
4. Infer offer slug + human campaign name from the transcript body.
5. Generate the variations in your head, then write the md file to `{client_id}/{campaign_type}/copy/`.
6. Verify every Primary Text is within the character limit (count with `len(text)` in your head — do NOT exceed).
7. Show the user the output path and a one-line summary of each variation.

$ARGUMENTS
