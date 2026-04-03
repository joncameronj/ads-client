Get detailed performance metrics (spend, unique outbound clicks, unique outbound CTR, applications submitted, cost per application, ROAS) for a campaign, ad set, or ad.

Use the `mcp__meta-ads__get_insights` tool.

Required from user:
- object_id: The campaign, ad set, or ad ID
- level: "campaign", "adset", or "ad"

Optional:
- date_preset: today, yesterday, last_7d (default), last_14d, last_30d, lifetime
- date_start / date_end: Custom date range (YYYY-MM-DD)

Present results clearly with key metrics highlighted.

$ARGUMENTS
