Ingest and transcribe all videos for the active client using local Whisper.

## Usage
`/ingest-video <campaign_type> [model]`

- `campaign_type` — `conversion` or `content` (required)
- `model` — whisper model (optional, default `base`). Options: `tiny`, `base`, `small`, `medium`, `large`. Larger = more accurate but slower.

## What it does
1. Reads the active client's `client_id` from `.active-client` in the repo root.
2. Runs `.venv/bin/python scripts/transcribe.py` against `{client_id}/{campaign_type}/videos/`.
3. Writes one markdown transcript per video into `{client_id}/{campaign_type}/transcripts/` with filename template:
   `{client_id}_{YYYY-MM-DD}_{video-slug}.md`
4. Skips videos that already have a transcript (unless user passes `--force` in `$ARGUMENTS`).

## Steps
1. Read `/Users/joncameron/Code/ads-client/.active-client` to get the active client_id.
2. Parse `$ARGUMENTS`:
   - First word = `campaign_type` (conversion | content)
   - Second word (if present) = `model`
3. Confirm the target folder exists: `{client_id}/{campaign_type}/videos/`. If empty, tell the user to drop videos in there and stop.
4. Run the Bash command:
   ```
   cd /Users/joncameron/Code/ads-client && .venv/bin/python scripts/transcribe.py \
     --client-id {client_id} \
     --campaign-type {campaign_type} \
     --videos-dir {client_id}/{campaign_type}/videos \
     --transcripts-dir {client_id}/{campaign_type}/transcripts \
     --model {model_or_default}
   ```
5. Report how many videos were transcribed, how many were skipped, and list the output files. Tell the user to run `/convert-to-copy <campaign_type> <length> <transcript-file>` next.

$ARGUMENTS
