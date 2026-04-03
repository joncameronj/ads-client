Analyze ads and rank by performance. Returns top performers with composite score, verdict, and creative copy.

Use the `mcp__meta-ads__find_winners` tool.

Required from user:
- metric: "roas", "cost_per_application", "unique_outbound_ctr", "cost_per_unique_outbound_click", or "cost_per_lead"

Optional:
- campaign_id: Scope to a specific campaign (omit for entire account)
- date_preset: last_7d (default), last_14d, last_30d
- min_spend: Minimum spend in $ to qualify (default $10)
- top_n: Number of top ads to return (default 10, max 50)

Present results as a ranked list with key metrics and the creative copy that's winning.

$ARGUMENTS
