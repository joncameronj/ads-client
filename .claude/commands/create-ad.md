Create a new ad within an existing ad set using an existing creative. Created in PAUSED status by default.

Use the `mcp__meta-ads__create_ad` tool.

Required from user:
- adset_id: Ad set ID to add the ad to
- name: Ad name
- creative_id: Creative ID (from /create-creative)

Optional:
- status: PAUSED (default) or ACTIVE

Confirm the ad was created and show the new ad ID.

$ARGUMENTS
