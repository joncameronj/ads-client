List all Meta ad campaigns. Optionally filter by status and limit results.

Use the `mcp__meta-ads__list_campaigns` tool.

- If the user provides a status filter (ACTIVE, PAUSED, ARCHIVED), use it. Otherwise default to ALL.
- If the user specifies a limit, use it. Otherwise default to 25.
- Present results in a clean table format showing campaign name, ID, status, and spend.

$ARGUMENTS
