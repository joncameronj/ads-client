Change placements on an existing ad set. Audience Network is NEVER included.

Use the `mcp__meta-ads__update_adset_placements` tool.

Required from user:
- adset_id: Ad set ID to update
- placements: New placement configuration
  - publisher_platforms: e.g., ["facebook", "instagram"]
  - facebook_positions: e.g., ["feed", "story", "reel"]
  - instagram_positions: e.g., ["stream", "story", "reels"]

Confirm the placement changes.

$ARGUMENTS
