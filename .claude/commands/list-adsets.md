List ad sets with budget, targeting summary, and placements.

Use the `mcp__meta-ads__list_adsets` tool.

- If the user provides a campaign_id, filter by it.
- If the user provides a status filter (ACTIVE, PAUSED, ARCHIVED), use it. Otherwise default to ALL.
- If the user specifies a limit, use it. Otherwise default to 25.
- Present results in a clean table showing ad set name, ID, status, budget, and targeting summary.

$ARGUMENTS
