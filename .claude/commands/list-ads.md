List individual ads with status and performance summary.

Use the `mcp__meta-ads__list_ads` tool.

- If the user provides a campaign_id or adset_id, filter by it.
- If the user provides a status filter (ACTIVE, PAUSED, ARCHIVED), use it. Otherwise default to ALL.
- If the user specifies a limit, use it. Otherwise default to 25.
- Present results in a clean table showing ad name, ID, status, and performance.

$ARGUMENTS
